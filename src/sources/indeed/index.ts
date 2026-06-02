/**
 * Connecteur **Indeed** (fr.indeed.com) — généraliste **France**, gros volume.
 *
 * Source 🔴 (cf. `SOURCES.md`, ADR-0030) : API Publisher **fermée** + anti-bot. La page de recherche
 * passe néanmoins via la **brique navigateur** (Chromium headless, vérifié 2026-06, sans CAPTCHA) →
 * parsing cheerio des cartes `.job_seen_beacon`. Recherche par **phrases métier FR** (comme HelloWork).
 *
 * ⚠️ **ToS** : Indeed interdit le scraping ; densité 3D **faible** (beaucoup de pubs/élargissements).
 * Posture **prudente** (peu de requêtes, throttle, offres **publiques** only, attribution). Généraliste
 * → **pas de plancher** : le classifieur strict filtre fortement. Choix assumé par la proprio.
 */
import { load } from "cheerio";
import type { Offre } from "@/domain/offre";
import { htmlRenduLot } from "@/lib/navigateur";

export const SOURCE = "indeed";

const BASE = "https://fr.indeed.com";
/** Requêtes métier FR (peu nombreuses → politesse). */
const REQUETES = ["jeu vidéo", "infographiste 3D", "game designer", "animateur 3D"];
/** Nb max de cartes gardées par requête. */
const MAX_PAR_REQUETE = 25;

export interface RawJobIndeed {
  jk: string;
  titre: string;
  studio: string | null;
  lieu: string | null;
}

function compact(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Parse une page de résultats Indeed (HTML rendu) → offres brutes. Testable hors-réseau. */
export function parseListe(html: string): RawJobIndeed[] {
  const $ = load(html);
  const out: RawJobIndeed[] = [];
  const vus = new Set<string>();

  $(".job_seen_beacon").each((_, el) => {
    const bloc = $(el);
    const jk =
      bloc.find("[data-jk]").first().attr("data-jk") || bloc.attr("data-jk") || "";
    if (!jk || vus.has(jk)) return;

    const titre = compact(bloc.find("h2.jobTitle, h3.jobTitle, .jobTitle").first().text());
    if (!titre) return;
    vus.add(jk);

    const studio = compact(bloc.find('[data-testid="company-name"]').first().text()) || null;
    const lieu = compact(bloc.find('[data-testid="text-location"]').first().text()) || null;
    out.push({ jk, titre, studio, lieu });
  });

  return out;
}

/** Récupère les offres Indeed : une recherche par phrase métier (navigateur), puis parsing. */
export async function fetchOffres(): Promise<RawJobIndeed[]> {
  const urls = REQUETES.map((q) => `${BASE}/jobs?q=${encodeURIComponent(q)}`);
  const pages = await htmlRenduLot(urls, { attendreMs: 4000, pauseEntreMs: 2000 });

  const out: RawJobIndeed[] = [];
  const vus = new Set<string>();
  for (const html of pages) {
    if (!html) continue;
    for (const job of parseListe(html).slice(0, MAX_PAR_REQUETE)) {
      if (vus.has(job.jk)) continue;
      vus.add(job.jk);
      out.push(job);
    }
  }
  return out;
}

/** Ramène une offre brute Indeed au type métier `Offre`. */
export function normalize(raw: RawJobIndeed): Offre {
  return {
    id: `${SOURCE}:${raw.jk}`,
    source: SOURCE,
    sourceId: raw.jk,
    url: `${BASE}/viewjob?jk=${raw.jk}`, // URL canonique de l'offre (attribution)
    titre: raw.titre,
    studio: raw.studio,
    pays: "FR",
    ville: raw.lieu,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; pas de plancher (généraliste) → classifieur strict
    langue: "fr",
    salaire: null,
    publieLe: null, // dates relatives (« il y a 3 j ») non fiables → laissées vides
    recupereLe: new Date(),
    description: null, // liste seule (titre suffit au tri ; détail = page protégée)
  };
}
