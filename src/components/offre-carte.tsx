/**
 * Carte d'une offre dans le flux.
 *
 * Principes produit :
 * - **Attribution** obligatoire : source affichée + lien direct vers l'annonce
 *   officielle (cf. CLAUDE.md §6). Le titre et le bouton pointent vers `url`.
 * - **Étiquettes enrichies** mises en avant (logiciels, spécialités, niveau,
 *   contrat, mode) — le différenciant du produit. Une offre sans étiquette
 *   reste parfaitement valide (R-2).
 * Composant serveur pur.
 */
import type { OffreRow } from "@/db/schema";
import type { Contrat, Experience, ModeTravail } from "@/domain/offre";
import { Etiquette } from "@/components/etiquette";
import {
  libelleContrat,
  libelleExperience,
  libelleMode,
  libelleSource,
  libelleSpecialite,
  t,
} from "@/lib/i18n";

const fmtDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function ligneLieu(ville: string | null, pays: string | null): string {
  const parts = [ville, pays].filter(Boolean);
  return parts.length ? parts.join(" · ") : t.offre.paysInconnu;
}

export function OffreCarte({ offre }: { offre: OffreRow }) {
  const aEtiquettes =
    offre.logiciels.length > 0 ||
    offre.specialites.length > 0 ||
    offre.experience != null ||
    offre.contrat != null ||
    offre.modeTravail != null;

  return (
    <article className="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-zinc-100">
            <a
              href={offre.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="hover:text-sky-400 hover:underline"
            >
              {offre.titre}
            </a>
          </h3>
          <p className="mt-0.5 truncate text-sm text-zinc-400">
            {offre.studio ? (
              <span className="text-zinc-300">{offre.studio}</span>
            ) : null}
            {offre.studio ? " — " : null}
            {ligneLieu(offre.ville, offre.pays)}
          </p>
        </div>
        {offre.salaire ? (
          <span className="shrink-0 whitespace-nowrap text-sm font-medium text-emerald-400">
            {offre.salaire}
          </span>
        ) : null}
      </div>

      {/* Étiquettes enrichies */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {offre.contrat ? (
          <Etiquette ton="accent">
            {libelleContrat(offre.contrat as Contrat)}
          </Etiquette>
        ) : null}
        {offre.experience ? (
          <Etiquette ton="accent">
            {libelleExperience(offre.experience as Experience)}
          </Etiquette>
        ) : null}
        {offre.modeTravail ? (
          <Etiquette>{libelleMode(offre.modeTravail as ModeTravail)}</Etiquette>
        ) : null}
        {offre.logiciels.map((l) => (
          <Etiquette key={`logi-${l}`} ton="logiciel">
            {l}
          </Etiquette>
        ))}
        {offre.specialites.map((s) => (
          <Etiquette key={`spe-${s}`}>{libelleSpecialite(s)}</Etiquette>
        ))}
        {!aEtiquettes ? (
          <span className="text-xs italic text-zinc-600">
            {t.offre.aucuneEtiquette}
          </span>
        ) : null}
      </div>

      {/* Pied : attribution + lien */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3 text-xs text-zinc-500">
        <span>
          {offre.publieLe
            ? `${t.offre.publieeLe} ${fmtDate.format(offre.publieLe)}`
            : `${t.offre.recupereeLe} ${fmtDate.format(offre.recupereLe)}`}
          {" · "}
          {t.offre.via}{" "}
          <span className="font-medium text-zinc-400">
            {libelleSource(offre.source)}
          </span>
        </span>
        <a
          href={offre.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-sky-400 hover:text-sky-300 hover:underline"
        >
          {t.offre.voir} →
        </a>
      </div>
    </article>
  );
}
