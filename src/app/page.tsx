/**
 * Dashboard — le cœur du produit (UC-1 « scan rapide » + UC-2 « chasse ciblée »).
 *
 * Server Component asynchrone : il lit les `searchParams` (Promise en Next 16),
 * en dérive les filtres, puis interroge Postgres directement via la couche
 * `offres-repo`. Aucun compte, aucune friction : on arrive, on voit le flux.
 */
import Link from "next/link";
import {
  listerOffres,
  compterParVue,
  listerPays,
  listerLogiciels,
  listerSpecialites,
  VUES,
  type FiltreOffres,
  type Vue,
} from "@/lib/offres-repo";
import {
  CONTRATS,
  EXPERIENCES,
  MODES_TRAVAIL,
  type Contrat,
  type Experience,
  type ModeTravail,
} from "@/domain/offre";
import { construireHref, premier, type ParamsBruts } from "@/lib/url";
import { Onglets } from "@/components/onglets";
import { BarreFiltres } from "@/components/barre-filtres";
import { OffreCarte } from "@/components/offre-carte";
import { t } from "@/lib/i18n";

/** Transforme les `searchParams` bruts en filtres validés (valeurs inconnues ignorées). */
function lireFiltre(params: ParamsBruts): FiltreOffres {
  const vueBrute = premier(params.vue);
  const vue: Vue = VUES.includes(vueBrute as Vue) ? (vueBrute as Vue) : "coeur";

  const contratBrut = premier(params.contrat);
  const contrat = CONTRATS.includes(contratBrut as Contrat)
    ? (contratBrut as Contrat)
    : undefined;

  const expBrute = premier(params.experience);
  const experience = EXPERIENCES.includes(expBrute as Experience)
    ? (expBrute as Experience)
    : undefined;

  const modeBrut = premier(params.mode);
  const mode = MODES_TRAVAIL.includes(modeBrut as ModeTravail)
    ? (modeBrut as ModeTravail)
    : undefined;

  const pageBrute = Number.parseInt(premier(params.page) ?? "1", 10);
  const page = Number.isFinite(pageBrute) && pageBrute > 0 ? pageBrute : 1;

  return {
    vue,
    pays: premier(params.pays),
    contrat,
    experience,
    // Logiciel/spécialité : valeurs libres validées par la facette (un inconnu → 0 résultat).
    logiciel: premier(params.logiciel),
    specialite: premier(params.specialite),
    mode,
    q: premier(params.q),
    page,
  };
}

export default async function Dashboard({
  searchParams,
}: PageProps<"/">) {
  const filtre = lireFiltre(await searchParams);

  // Requêtes parallèles (Promise.all — cf. docs Next « parallel data fetching »).
  const [{ offres, page, aPageSuivante }, comptes, pays, logiciels, specialites] =
    await Promise.all([
      listerOffres(filtre),
      compterParVue(filtre),
      listerPays(filtre.vue),
      listerLogiciels(filtre.vue),
      listerSpecialites(filtre.vue),
    ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          {t.titreApp}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{t.sousTitre}</p>
      </header>

      <Onglets filtre={filtre} comptes={comptes} />

      <p className="mt-3 text-sm text-zinc-500">{t.vueAide[filtre.vue]}</p>

      <div className="mt-4">
        <BarreFiltres
          filtre={filtre}
          pays={pays}
          logiciels={logiciels}
          specialites={specialites}
        />
      </div>

      {offres.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-zinc-300">{t.liste.aucune}</p>
          <p className="mt-1 text-sm text-zinc-500">{t.liste.aucuneAide}</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {offres.map((offre) => (
            <li key={offre.id}>
              <OffreCarte offre={offre} />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {offres.length > 0 ? (
        <nav className="mt-8 flex items-center justify-between border-t border-zinc-800 pt-4 text-sm">
          {page > 1 ? (
            <Link
              href={construireHref(filtre, { page: page - 1 })}
              className="text-zinc-300 hover:text-sky-400 hover:underline"
            >
              {t.liste.pagePrecedente}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-zinc-500">
            {t.liste.page} {page}
          </span>
          {aPageSuivante ? (
            <Link
              href={construireHref(filtre, { page: page + 1 })}
              className="text-zinc-300 hover:text-sky-400 hover:underline"
            >
              {t.liste.pageSuivante}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      <footer className="mt-12 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-600">
        {t.pied}
      </footer>
    </div>
  );
}
