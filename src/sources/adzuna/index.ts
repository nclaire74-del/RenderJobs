/**
 * Connecteur **Adzuna** — agrégateur d'offres **international** (API JSON officielle).
 *
 * Source 🟢 Tier 1 (clé API simple, ToS API publique). Couvre de nombreux pays → c'est notre
 * principale source **hors France** (direction « international d'emblée », ADR-0009).
 *
 * Adzuna n'a **pas de taxonomie type ROME** : on interroge par **phrases métier** (cf.
 * `Secteur.requetesTexte`), une requête par phrase et par pays, puis on déduplique. Le bruit
 * résiduel est trié par le pipeline de pertinence (`coeur`/`connexe`/`hors_scope`) — jamais perdu.
 *
 * - `fetchOffres(secteur, opts)` : boucle pays × phrases, pagine, valide (Zod), dédup par id.
 * - `normalize()` : ramène une offre brute au type métier `Offre` (champs déduits laissés au pipeline).
 *
 * API : GET https://api.adzuna.com/v1/api/jobs/{pays}/search/{page}?app_id=…&app_key=…&what=…
 * Auth : `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` (.env.local).
 */
import { z } from "zod";
import type { Contrat, Offre } from "@/domain/offre";
import type { Secteur } from "@/domain/secteur";

export const SOURCE = "adzuna";

const API_BASE = "https://api.adzuna.com/v1/api/jobs";
const RESULTATS_PAR_PAGE_MAX = 50; // plafond API

/** Codes pays Adzuna ciblés par défaut (les marchés 3D/JV les plus actifs). */
const PAYS_DEFAUT = ["fr", "gb", "us"];

/** Code pays Adzuna → nom de pays lisible (UI en français). */
const NOM_PAYS: Record<string, string> = {
  fr: "France",
  gb: "Royaume-Uni",
  us: "États-Unis",
  de: "Allemagne",
  ca: "Canada",
  es: "Espagne",
  it: "Italie",
  nl: "Pays-Bas",
  be: "Belgique",
  at: "Autriche",
  ch: "Suisse",
  pl: "Pologne",
  au: "Australie",
  nz: "Nouvelle-Zélande",
  in: "Inde",
  sg: "Singapour",
  br: "Brésil",
  mx: "Mexique",
  za: "Afrique du Sud",
};

/** Offre brute Adzuna (champs réellement exploités ; `passthrough` tolère le reste). */
export const RawOffreAdzuna = z
  .object({
    id: z.coerce.string(),
    title: z.coerce.string(),
    description: z.string().optional(),
    created: z.string().optional(),
    redirect_url: z.string(),
    company: z.object({ display_name: z.string().optional() }).partial().optional(),
    location: z
      .object({
        display_name: z.string().optional(),
        area: z.array(z.string()).optional(),
      })
      .partial()
      .optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    salary_min: z.coerce.number().optional(),
    salary_max: z.coerce.number().optional(),
    salary_is_predicted: z.coerce.string().optional(),
    contract_type: z.string().optional(), // permanent | contract
    contract_time: z.string().optional(), // full_time | part_time
    /** Injecté par nous (pas renvoyé par l'API) : le pays interrogé, source de vérité du `pays`. */
    paysCode: z.string().optional(),
  })
  .passthrough();
export type RawOffreAdzuna = z.infer<typeof RawOffreAdzuna>;

const SearchResponse = z
  .object({
    count: z.number().optional(),
    results: z.array(z.unknown()).optional(),
  })
  .passthrough();

export interface FetchOptions {
  /** Codes pays Adzuna à interroger. Défaut : France, Royaume-Uni, États-Unis. */
  pays?: string[];
  /** Pages récupérées par requête (50 offres/page). Défaut : 1. */
  maxPages?: number;
  /** Fenêtre de fraîcheur en jours (`max_days_old`). Défaut : 31. */
  maxJoursAnciennete?: number;
  /** Throttle entre appels (ms) pour respecter le rate limit. Défaut : 1200. */
  delaiMs?: number;
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Construit un libellé de salaire à partir des bornes Adzuna (ignore les estimations). */
export function construireSalaire(raw: RawOffreAdzuna): string | null {
  // `salary_is_predicted` = "1" → estimation algorithmique, pas une vraie donnée d'annonce.
  if (raw.salary_is_predicted === "1") return null;
  const min = raw.salary_min;
  const max = raw.salary_max;
  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `À partir de ${fmt(min)}`;
  if (max) return `Jusqu'à ${fmt(max)}`;
  return null;
}

/** Mappe le contrat Adzuna vers notre enum métier (best-effort). */
export function mapContrat(raw: RawOffreAdzuna): Contrat | null {
  const titre = raw.title.toLowerCase();
  if (/\b(stage|stagiaire|internship|intern)\b/.test(titre)) return "stage";
  if (/\b(alternance|apprentice|apprenticeship)\b/.test(titre)) return "alternance";
  if (/\b(freelance|contractor)\b/.test(titre)) return "freelance";
  switch (raw.contract_type) {
    case "permanent":
      return "CDI";
    case "contract":
      return "CDD";
    default:
      return null;
  }
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Phrases de recherche dédupliquées (insensible à la casse), depuis la config de secteur. */
function phrasesPourSecteur(secteur: Secteur): string[] {
  const vues = new Set<string>();
  const out: string[] = [];
  for (const p of secteur.requetesTexte ?? []) {
    const cle = p.trim().toLowerCase();
    if (cle && !vues.has(cle)) {
      vues.add(cle);
      out.push(p.trim());
    }
  }
  return out;
}

/**
 * Récupère les offres brutes d'un secteur via Adzuna (multi-pays × phrases).
 * Résilient : une requête en échec (hors auth) est journalisée et ignorée ; un 429 stoppe
 * proprement la collecte en cours (rate limit) ; les identifiants invalides lèvent une erreur.
 */
export async function fetchOffres(
  secteur: Secteur,
  opts: FetchOptions = {},
): Promise<RawOffreAdzuna[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY manquants (.env.local).");
  }

  const pays = opts.pays ?? PAYS_DEFAUT;
  const maxPages = opts.maxPages ?? 1;
  const maxJours = opts.maxJoursAnciennete ?? 31;
  const delaiMs = opts.delaiMs ?? 1200;
  const phrases = phrasesPourSecteur(secteur);

  const parId = new Map<string, RawOffreAdzuna>();
  let premierAppel = true;

  for (const pa of pays) {
    for (const phrase of phrases) {
      for (let page = 1; page <= maxPages; page++) {
        if (!premierAppel) await attendre(delaiMs);
        premierAppel = false;

        const url = new URL(`${API_BASE}/${pa}/search/${page}`);
        url.searchParams.set("app_id", appId);
        url.searchParams.set("app_key", appKey);
        url.searchParams.set("results_per_page", String(RESULTATS_PAR_PAGE_MAX));
        url.searchParams.set("what", phrase);
        url.searchParams.set("max_days_old", String(maxJours));
        url.searchParams.set("sort_by", "date");
        url.searchParams.set("content-type", "application/json");

        const res = await fetch(url);

        // Identifiants rejetés → problème de config, on échoue franchement.
        if (res.status === 401 || res.status === 403) {
          const detail = await res.text().catch(() => "");
          throw new Error(`Adzuna : identifiants rejetés (${res.status}) : ${detail.slice(0, 200)}`);
        }
        // Rate limit atteint → inutile d'insister, on rend ce qu'on a.
        if (res.status === 429) {
          console.warn(`[adzuna] rate limit (429) sur ${pa}/« ${phrase} » — collecte écourtée.`);
          return [...parId.values()];
        }
        if (!res.ok) {
          console.warn(`[adzuna] ${res.status} sur ${pa}/« ${phrase} » p.${page} — requête ignorée.`);
          break; // page suivante inutile pour cette requête
        }

        const data = SearchResponse.parse(await res.json());
        const resultats = data.results ?? [];
        for (const brut of resultats) {
          const withPays =
            brut && typeof brut === "object" ? { ...brut, paysCode: pa } : brut;
          const parsed = RawOffreAdzuna.safeParse(withPays);
          if (parsed.success) parId.set(parsed.data.id, parsed.data);
        }

        // Page incomplète → plus rien à paginer pour cette requête.
        if (resultats.length < RESULTATS_PAR_PAGE_MAX) break;
      }
    }
  }

  return [...parId.values()];
}

/** Ramène une offre brute Adzuna au type métier `Offre`. */
export function normalize(raw: RawOffreAdzuna): Offre {
  const pays =
    (raw.paysCode && NOM_PAYS[raw.paysCode]) ??
    raw.location?.area?.[0] ??
    null;

  return {
    id: `${SOURCE}:${raw.id}`,
    source: SOURCE,
    sourceId: raw.id,
    url: raw.redirect_url,
    titre: raw.title,
    studio: raw.company?.display_name ?? null,
    pays,
    ville: raw.location?.display_name ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    modeTravail: null, // déduit (enrichissement)
    contrat: mapContrat(raw),
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut conservateur ; recalculé par le pipeline (classer)
    langue: null, // déduit
    salaire: construireSalaire(raw),
    publieLe: parseDate(raw.created),
    recupereLe: new Date(),
    description: raw.description ?? null,
  };
}
