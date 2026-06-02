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
import type { Offre } from "@/domain/offre";
import { SECTEUR_ACTIF } from "@/config/secteur-actif";
import { traiter } from "./traiter";
import { upsertOffres } from "./upsert";

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

/** Collecte toutes les sources actives. Chaque source est isolée (une qui échoue n'arrête pas les autres). */
export async function collectToutes(): Promise<CollectReport[]> {
  return [
    await collectFranceTravail(),
    await collectAfjv(),
    await collectAdzuna(),
    await collectGamesCareer(),
    await collectAts(),
    await collectRemoteGameJobs(),
  ];
}
