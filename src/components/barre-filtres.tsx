/**
 * Barre de filtres (UC-2 : la chasse ciblée).
 *
 * Un simple `<form method="get">` : pas de JavaScript client, état porté par
 * l'URL (partageable, navigable). Les noms de champs correspondent aux clés des
 * `searchParams` (`pays`, `contrat`, `experience`, `q`). `vue` est conservé en
 * champ caché pour rester sur le même onglet.
 *
 * Pour la cible n°1 (juniors), des raccourcis mettent en avant stage / alternance
 * / junior (cf. PRODUIT.md persona 1).
 * Composant serveur pur.
 */
import Link from "next/link";
import type { FiltreOffres, FacettePays } from "@/lib/offres-repo";
import { CONTRATS, EXPERIENCES } from "@/domain/offre";
import { construireHref } from "@/lib/url";
import {
  libelleContrat,
  libelleExperience,
  RACCOURCIS_JUNIOR,
  t,
} from "@/lib/i18n";

const champ =
  "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

export function BarreFiltres({
  filtre,
  pays,
}: {
  filtre: FiltreOffres;
  pays: FacettePays[];
}) {
  const aFiltreActif = Boolean(
    filtre.pays || filtre.contrat || filtre.experience || filtre.q,
  );

  return (
    <section className="space-y-3">
      <form method="get" action="/" className="flex flex-wrap items-center gap-2">
        {/* Conserver l'onglet courant. */}
        <input type="hidden" name="vue" value={filtre.vue} />

        <input
          type="search"
          name="q"
          defaultValue={filtre.q ?? ""}
          placeholder={t.filtres.recherche}
          className={`${champ} min-w-[14rem] flex-1`}
          aria-label={t.filtres.recherche}
        />

        <select
          name="pays"
          defaultValue={filtre.pays ?? ""}
          className={champ}
          aria-label={t.filtres.pays}
        >
          <option value="">{t.filtres.tousPays}</option>
          {pays.map((p) => (
            <option key={p.pays} value={p.pays}>
              {p.pays} ({p.n})
            </option>
          ))}
        </select>

        <select
          name="contrat"
          defaultValue={filtre.contrat ?? ""}
          className={champ}
          aria-label={t.filtres.contrat}
        >
          <option value="">{t.filtres.tousContrats}</option>
          {CONTRATS.map((c) => (
            <option key={c} value={c}>
              {libelleContrat(c)}
            </option>
          ))}
        </select>

        <select
          name="experience"
          defaultValue={filtre.experience ?? ""}
          className={champ}
          aria-label={t.filtres.experience}
        >
          <option value="">{t.filtres.tousNiveaux}</option>
          {EXPERIENCES.map((e) => (
            <option key={e} value={e}>
              {libelleExperience(e)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          {t.filtres.valider}
        </button>

        {aFiltreActif ? (
          <Link
            href={construireHref({ vue: filtre.vue })}
            className="px-2 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:underline"
          >
            {t.filtres.reinitialiser}
          </Link>
        ) : null}
      </form>

      {/* Raccourcis juniors (cible n°1). */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-500">{t.filtres.raccourcisJunior}</span>
        {RACCOURCIS_JUNIOR.map((r) => {
          const href = construireHref(
            { vue: filtre.vue },
            { contrat: r.contrat, experience: r.experience, page: 1 },
          );
          return (
            <Link
              key={r.label}
              href={href}
              className="rounded-full border border-amber-800/60 bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-300 hover:border-amber-600 hover:bg-amber-900/40"
            >
              {r.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
