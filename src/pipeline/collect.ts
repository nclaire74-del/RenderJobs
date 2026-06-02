/**
 * Pipeline de collecte minimal : fetch → normalize → upsert.
 *
 * Orchestrateur appelé par le cron (et par le script `npm run collect` en local).
 * Pour l'instant un seul connecteur (France Travail) ; d'autres s'ajouteront ici.
 */
import {
  fetchOffres as fetchFranceTravail,
  normalize as normalizeFranceTravail,
} from "@/sources/france-travail";
import {
  fetchOffres as fetchAfjv,
  normalize as normalizeAfjv,
} from "@/sources/afjv";
import {
  fetchOffres as fetchAdzuna,
  normalize as normalizeAdzuna,
} from "@/sources/adzuna";
import {
  fetchOffres as fetchGamesCareer,
  normalize as normalizeGamesCareer,
} from "@/sources/games-career";
import {
  fetchOffres as fetchAts,
  normalize as normalizeAts,
} from "@/sources/ats";
import {
  fetchOffres as fetchRemoteGameJobs,
  normalize as normalizeRemoteGameJobs,
} from "@/sources/remote-game-jobs";
import {
  fetchOffres as fetchHitmarker,
  normalize as normalizeHitmarker,
} from "@/sources/hitmarker";
import {
  fetchOffres as fetchGameJobsCo,
  normalize as normalizeGameJobsCo,
} from "@/sources/gamejobs-co";
import {
  fetchOffres as fetchHelloWork,
  normalize as normalizeHelloWork,
} from "@/sources/hellowork";
import {
  fetchOffres as fetchRemoteOk,
  normalize as normalizeRemoteOk,
} from "@/sources/remoteok";
import {
  fetchOffres as fetchWorkWithIndies,
  normalize as normalizeWorkWithIndies,
} from "@/sources/work-with-indies";
import {
  fetchOffres as fetchPixelCareer,
  normalize as normalizePixelCareer,
} from "@/sources/pixelcareer";
import {
  fetchOffres as fetch80Level,
  normalize as normalize80Level,
} from "@/sources/80-level";
import {
  fetchOffres as fetchJobicy,
  normalize as normalizeJobicy,
} from "@/sources/jobicy";
import {
  fetchOffres as fetchRemotive,
  normalize as normalizeRemotive,
} from "@/sources/remotive";
import {
  fetchOffres as fetchArtStation,
  normalize as normalizeArtStation,
} from "@/sources/artstation";
import {
  fetchOffres as fetchAwn,
  normalize as normalizeAwn,
} from "@/sources/awn";
import {
  fetchOffres as fetchGrackle,
  normalize as normalizeGrackle,
} from "@/sources/gracklehq";
import {
  fetchOffres as fetchIndeed,
  normalize as normalizeIndeed,
} from "@/sources/indeed";
import type { Offre } from "@/domain/offre";
import { SECTEUR_ACTIF } from "@/config/secteur-actif";
import { traiter } from "./traiter";
import { upsertOffres } from "./upsert";
import { purgeOffresPerimees } from "./purge";
import { analyserSante, envoyerAlertes, type Alerte } from "./surveillance";
import { comptesParSource } from "@/lib/offres-repo";

export interface CollectReport {
  source: string;
  recuperees: number;
  ecrites: number;
  erreur?: string;
}

/** Lance la collecte France Travail et enregistre les offres. */
export async function collectFranceTravail(): Promise<CollectReport> {
  try {
    const bruts = await fetchFranceTravail(SECTEUR_ACTIF);
    const offres: Offre[] = bruts.map(normalizeFranceTravail).map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "france-travail", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "france-travail",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte AFJV (flux RSS jeu vidéo France) et enregistre les offres. */
export async function collectAfjv(): Promise<CollectReport> {
  try {
    const bruts = await fetchAfjv();
    // AFJV = board curé 100 % jeu vidéo → plancher `connexe` (jamais rejeté par le tri générique).
    const offres: Offre[] = bruts.map(normalizeAfjv).map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "afjv", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "afjv",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte Adzuna (agrégateur international, par phrases métier) et enregistre les offres. */
export async function collectAdzuna(): Promise<CollectReport> {
  try {
    const bruts = await fetchAdzuna(SECTEUR_ACTIF);
    // Net large multi-pays → pas de plancher ; le pipeline classe coeur/connexe/hors_scope.
    const offres: Offre[] = bruts.map(normalizeAdzuna).map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "adzuna", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "adzuna",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte Games-Career (flux RSS jeu vidéo Europe) et enregistre les offres. */
export async function collectGamesCareer(): Promise<CollectReport> {
  try {
    const bruts = await fetchGamesCareer();
    // Board curé jeu vidéo → plancher `connexe` (jamais rejeté par le tri générique).
    const offres: Offre[] = bruts
      .map(normalizeGamesCareer)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "games-career", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "games-career",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte ATS (offres directes des studios via Greenhouse/Lever/Ashby) et enregistre. */
export async function collectAts(): Promise<CollectReport> {
  try {
    const bruts = await fetchAts();
    // Studios curés (100 % industrie du jeu) → plancher `connexe` ; le classifieur promeut les
    // départements « craft » en `coeur` (cf. RD-TRI.md §5bis). Studio connu = jamais perdu.
    const offres: Offre[] = bruts
      .map(normalizeAts)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "ats", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "ats",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte RemoteGameJobs (board jeu vidéo 100 % remote, scraping léger) et enregistre. */
export async function collectRemoteGameJobs(): Promise<CollectReport> {
  try {
    const bruts = await fetchRemoteGameJobs();
    // Board curé 100 % jeu vidéo → plancher `connexe` (jamais rejeté par le tri générique).
    const offres: Offre[] = bruts
      .map(normalizeRemoteGameJobs)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "remote-game-jobs", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "remote-game-jobs",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte Hitmarker (board gaming/esport mondial via sitemap + JSON-LD) et enregistre. */
export async function collectHitmarker(): Promise<CollectReport> {
  try {
    const bruts = await fetchHitmarker();
    // Board gaming/esport **large** (porte des listings d'entreprises entières, ex. NVIDIA santé/IA
    // hors secteur) → **pas de plancher** : le classifieur strict filtre (comme Adzuna). Le cœur est
    // piloté par le titre ; le hors-secteur net est caché (cf. décision « tri strict », ADR-0016).
    const offres: Offre[] = bruts
      .map(({ raw, url }) => normalizeHitmarker(raw, url))
      .map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "hitmarker", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "hitmarker",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte GameJobs.co (board game dev via flux Atom) et enregistre. */
export async function collectGameJobsCo(): Promise<CollectReport> {
  try {
    const bruts = await fetchGameJobsCo();
    // Board curé game dev → plancher `connexe` ; cœur piloté par le titre.
    const offres: Offre[] = bruts
      .map(normalizeGameJobsCo)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "gamejobs-co", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "gamejobs-co",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte HelloWork (généraliste FR via recherche + JSON-LD) et enregistre. */
export async function collectHelloWork(): Promise<CollectReport> {
  try {
    const bruts = await fetchHelloWork();
    // Généraliste FR (filet large) → **pas de plancher** : le classifieur strict filtre (comme Adzuna).
    const offres: Offre[] = bruts
      .map(({ raw, url }) => normalizeHelloWork(raw, url))
      .map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "hellowork", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "hellowork",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte RemoteOK (board remote, API JSON) et enregistre. */
export async function collectRemoteOk(): Promise<CollectReport> {
  try {
    const bruts = await fetchRemoteOk();
    // Généraliste remote → **pas de plancher** : le classifieur strict filtre.
    const offres: Offre[] = bruts.map(normalizeRemoteOk).map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "remoteok", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return {
      source: "remoteok",
      recuperees: 0,
      ecrites: 0,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lance la collecte Work With Indies (board jeu indé via RSS) et enregistre. */
export async function collectWorkWithIndies(): Promise<CollectReport> {
  try {
    const bruts = await fetchWorkWithIndies();
    const offres: Offre[] = bruts
      .map(normalizeWorkWithIndies)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "work-with-indies", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "work-with-indies", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Lance la collecte PixelCareer (agrégateur 3D/anim/VFX via RSS) et enregistre. */
export async function collectPixelCareer(): Promise<CollectReport> {
  try {
    const bruts = await fetchPixelCareer();
    const offres: Offre[] = bruts
      .map(normalizePixelCareer)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "pixelcareer", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "pixelcareer", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Lance la collecte 80 Level (board art/tech jeu via JSON embarqué) et enregistre. */
export async function collect80Level(): Promise<CollectReport> {
  try {
    const bruts = await fetch80Level();
    const offres: Offre[] = bruts
      .map(normalize80Level)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "80-level", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "80-level", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Lance la collecte Jobicy (board remote, industrie design/multimédia) et enregistre. */
export async function collectJobicy(): Promise<CollectReport> {
  try {
    const bruts = await fetchJobicy();
    const offres: Offre[] = bruts.map(normalizeJobicy).map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "jobicy", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "jobicy", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Lance la collecte Remotive (board remote, catégorie design) et enregistre. */
export async function collectRemotive(): Promise<CollectReport> {
  try {
    const bruts = await fetchRemotive();
    const offres: Offre[] = bruts.map(normalizeRemotive).map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "remotive", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "remotive", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Lance la collecte ArtStation (board art games/film via API publique) et enregistre. */
export async function collectArtStation(): Promise<CollectReport> {
  try {
    const bruts = await fetchArtStation();
    // Board curé art (games/film) → plancher `connexe` ; le cœur 3D est promu par le titre.
    const offres: Offre[] = bruts
      .map(normalizeArtStation)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "artstation", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "artstation", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Lance la collecte AWN (board animation/film/VFX via navigateur headless) et enregistre. */
export async function collectAwn(): Promise<CollectReport> {
  try {
    const bruts = await fetchAwn();
    // Board large média/animation → pas de plancher (comme Hitmarker) : le classifieur strict filtre.
    const offres: Offre[] = bruts.map(normalizeAwn).map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "awn", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "awn", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Lance la collecte GrackleHQ (agrégateur jeu vidéo via navigateur headless) et enregistre. */
export async function collectGrackle(): Promise<CollectReport> {
  try {
    const bruts = await fetchGrackle();
    // Agrégateur curé jeu vidéo → plancher `connexe` ; cœur promu par le titre.
    const offres: Offre[] = bruts
      .map(normalizeGrackle)
      .map((o) => traiter(o, { plancher: "connexe" }));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "gracklehq", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "gracklehq", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Lance la collecte Indeed (généraliste FR via navigateur, recherche multi-phrases) et enregistre. */
export async function collectIndeed(): Promise<CollectReport> {
  try {
    const bruts = await fetchIndeed();
    // Généraliste (filet large) → pas de plancher : le classifieur strict filtre fortement.
    const offres: Offre[] = bruts.map(normalizeIndeed).map((o) => traiter(o));
    const { recus, ecrits } = await upsertOffres(offres);
    return { source: "indeed", recuperees: recus, ecrites: ecrits };
  } catch (e) {
    return { source: "indeed", recuperees: 0, ecrites: 0, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Collecte toutes les sources actives. Chaque source est isolée (une qui échoue n'arrête pas les autres). */
export async function collectToutes(): Promise<CollectReport[]> {
  return [
    await collectFranceTravail(),
    await collectAfjv(),
    await collectAdzuna(),
    await collectGamesCareer(),
    await collectAts(),
    await collectRemoteGameJobs(),
    await collectHitmarker(),
    await collectGameJobsCo(),
    await collectHelloWork(),
    await collectRemoteOk(),
    await collectWorkWithIndies(),
    await collectPixelCareer(),
    await collect80Level(),
    await collectJobicy(),
    await collectRemotive(),
    await collectArtStation(),
    await collectAwn(),
    await collectGrackle(),
    await collectIndeed(),
  ];
}

export interface CollectGlobalResult {
  rapports: CollectReport[];
  /** Nombre d'offres périmées supprimées après la collecte (null si purge non lancée). */
  purgees: number | null;
  /** Alertes de santé des sources (échec / vide suspect). Vide = tout va bien. */
  alertes: Alerte[];
}

/** Surveille la santé des sources d'un run (compare à l'état base) et émet les alertes. Best-effort. */
async function surveiller(rapports: CollectReport[]): Promise<Alerte[]> {
  try {
    const alertes = analyserSante(rapports, await comptesParSource());
    await envoyerAlertes(alertes);
    return alertes;
  } catch (e) {
    console.error(`Surveillance indisponible : ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

/**
 * Sources **légères** (1 requête réseau chacune, pas de limite de débit) → sûres à rafraîchir
 * **souvent** (cron 20 min) pour un effet « quasi temps réel » sur les flux niche jeu/3D. Les sources
 * **lourdes / à quota** (France Travail paginé, Adzuna throttlé, Hitmarker & HelloWork = ~100+ pages)
 * restent dans `collectToutes()` (cron complet espacé, cf. `collecterEtPurger`). Cf. `SOURCES.md`.
 */
export async function collectLeger(): Promise<CollectReport[]> {
  return [
    await collectAfjv(),
    await collectGamesCareer(),
    await collectGameJobsCo(),
    await collectRemoteOk(),
    await collectRemoteGameJobs(),
    await collectAts(),
    await collectWorkWithIndies(),
    await collectPixelCareer(),
    await collect80Level(),
    await collectJobicy(),
    await collectRemotive(),
    await collectArtStation(),
  ];
}

/**
 * Orchestration complète : collecte **toutes** les sources puis **purge** les offres périmées.
 * Garde-fou : on ne purge **que si au moins une source a réussi** (sinon une panne réseau globale
 * — toutes les sources en échec → aucun `recupere_le` rafraîchi — viderait la base). Cf. `purge.ts`.
 */
export async function collecterEtPurger(): Promise<CollectGlobalResult> {
  const rapports = await collectToutes();
  const alertes = await surveiller(rapports);
  const auMoinsUnSucces = rapports.some((r) => !r.erreur && r.recuperees > 0);
  const purgees = auMoinsUnSucces ? await purgeOffresPerimees() : null;
  return { rapports, purgees, alertes };
}

/** Variante **légère** (sources rapides uniquement) + purge. Pour le cron fréquent (≈20 min). */
export async function collecterLegerEtPurger(): Promise<CollectGlobalResult> {
  const rapports = await collectLeger();
  const alertes = await surveiller(rapports);
  const auMoinsUnSucces = rapports.some((r) => !r.erreur && r.recuperees > 0);
  const purgees = auMoinsUnSucces ? await purgeOffresPerimees() : null;
  return { rapports, purgees, alertes };
}

/**
 * Sources **express** : flux **curés à une seule requête** (RSS/Atom), instantanés et sans quota
 * → rafraîchis **très** souvent (cron ≈ 5 min) pour un effet **temps réel** sur les offres niche
 * (ex. une annonce AFJV doit apparaître au plus vite). Sous-ensemble strict de `collectLeger`,
 * limité aux feeds à 1 fetch (pas d'ATS multi-studios, pas de cheerio multi-pages, pas de quota).
 */
export async function collectExpress(): Promise<CollectReport[]> {
  return [
    await collectAfjv(),
    await collectGamesCareer(),
    await collectGameJobsCo(),
  ];
}

/**
 * Variante **express** (flux curés instantanés) + surveillance, **sans purge** : l'express ne sert
 * qu'à faire entrer vite les nouvelles offres ; la purge des périmées reste au léger/complet.
 * Pour le cron très fréquent (≈5 min).
 */
export async function collecterExpress(): Promise<CollectGlobalResult> {
  const rapports = await collectExpress();
  const alertes = await surveiller(rapports);
  return { rapports, purgees: null, alertes };
}
