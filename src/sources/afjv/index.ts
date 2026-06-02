/**
 * Connecteur **AFJV** (Agence Française pour le Jeu Vidéo) — flux **RSS** public.
 *
 * Source 🟢 Tier 1 (cf. `SOURCES.md`) : pas d'API mais un flux RSS ouvert et stable
 * (`emploi.afjv.com/rss.xml`), pensé pour être consommé par des machines. **Cœur jeu vidéo
 * France** (+ Belgique) — la plus forte densité de pertinence du marché FR.
 *
 * - `fetchOffres()` : récupère et parse le flux RSS, valide chaque entrée (Zod), renvoie les
 *   items bruts. AFJV est mono-secteur (100 % jeu vidéo) → pas de ciblage par `Secteur` ici :
 *   tout le flux est pertinent, c'est le pipeline de classification qui range coeur/connexe.
 * - `normalize()` : ramène un item RSS au type métier `Offre`. Les champs déduits
 *   (logiciels, spécialités, niveau, pertinence, langue) sont remplis **plus tard** (pipeline).
 *
 * Particularités du flux :
 * - `description` courte au format « <Studio> recrute un(e) <rôle>. Poste basé à <ville> » →
 *   on en extrait studio + ville (best-effort, jamais bloquant).
 * - `category` multiples : type de contrat (Stage/CDI/CDD/Freelance/Alternance) + pays + métier.
 * - `link`/`guid` portent un identifiant stable (ex. `SINF1074-28926`) → `sourceId`.
 */
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { Contrat, Offre } from "@/domain/offre";

export const SOURCE = "afjv";

const FEED_URL = "https://emploi.afjv.com/rss.xml";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator; contact via afjv listing)";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  // Toujours des tableaux pour ces nœuds répétables (sinon objet seul quand 1 occurrence).
  isArray: (name) => name === "item" || name === "category",
});

/** Une entrée brute du flux RSS AFJV (champs réellement présents). */
export const RawItemAfjv = z.object({
  title: z.coerce.string(),
  link: z.coerce.string(),
  description: z.coerce.string().optional(),
  pubDate: z.coerce.string().optional(),
  category: z.array(z.coerce.string()).optional().default([]),
  guid: z.coerce.string().optional(),
});
export type RawItemAfjv = z.infer<typeof RawItemAfjv>;

/** Catégories de contrat AFJV → enum métier. */
const CONTRAT_PAR_CATEGORIE: Record<string, Contrat> = {
  stage: "stage",
  cdi: "CDI",
  cdd: "CDD",
  freelance: "freelance",
  alternance: "alternance",
};

/** Pays reconnus dans les catégories AFJV (le reste → null). */
const PAYS_CONNUS = new Set(["france", "belgique", "suisse", "canada", "luxembourg"]);

/** Extrait l'identifiant stable depuis le lien (`…/emploi-jeux-video/SINF1074-28926`). */
export function extraireSourceId(link: string): string {
  const sansQuery = link.split(/[?#]/)[0].replace(/\/+$/, "");
  return sansQuery.split("/").pop() || link;
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Mappe les catégories vers contrat + pays + famille métier (insensible à la casse/accents).
 *  Les catégories AFJV = contrat + pays + **famille métier** (ex. « Programmation », « Graphisme / Art »).
 *  La famille = ce qui n'est ni un contrat ni un pays → signal structuré pour le tri (cf. RD-TRI.md §2.3). */
export function lireCategories(categories: string[]): {
  contrat: Contrat | null;
  pays: string | null;
  famille: string | null;
} {
  let contrat: Contrat | null = null;
  let pays: string | null = null;
  let famille: string | null = null;
  for (const cat of categories) {
    const brut = cat.trim();
    const c = brut.toLowerCase();
    if (c in CONTRAT_PAR_CATEGORIE) {
      if (!contrat) contrat = CONTRAT_PAR_CATEGORIE[c];
    } else if (PAYS_CONNUS.has(c)) {
      if (!pays) pays = brut.charAt(0).toUpperCase() + brut.slice(1).toLowerCase();
    } else if (!famille && brut) {
      famille = brut; // ni contrat ni pays → famille métier
    }
  }
  return { contrat, pays, famille };
}

/** Extrait studio + ville de la description « <Studio> recrute … Poste basé à <ville> ». */
export function lireDescription(description: string | undefined): {
  studio: string | null;
  ville: string | null;
} {
  if (!description) return { studio: null, ville: null };
  const studio = description.match(/^(.*?)\s+recrute\b/i)?.[1]?.trim() || null;
  const ville = description.match(/poste\s+bas[ée]+\s+à\s+(.+?)\s*$/i)?.[1]?.trim() || null;
  return { studio, ville };
}

/** Récupère et parse le flux RSS AFJV. Renvoie les items bruts valides. */
export async function fetchOffres(): Promise<RawItemAfjv[]> {
  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml" },
  });
  if (!res.ok) {
    throw new Error(`Flux RSS AFJV inaccessible (${res.status} ${res.statusText}).`);
  }
  const xml = await res.text();
  return parseFlux(xml);
}

/** Parse un flux RSS AFJV (string) → items bruts valides. Séparé pour être testable hors réseau. */
export function parseFlux(xml: string): RawItemAfjv[] {
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown[] } };
  };
  const items = parsed?.rss?.channel?.item ?? [];
  const out: RawItemAfjv[] = [];
  for (const it of items) {
    const r = RawItemAfjv.safeParse(it);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** Ramène un item RSS AFJV au type métier `Offre`. */
export function normalize(raw: RawItemAfjv): Offre {
  const sourceId = extraireSourceId(raw.link);
  const { contrat, pays, famille } = lireCategories(raw.category);
  const { studio, ville } = lireDescription(raw.description);

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url: raw.link,
    titre: raw.title,
    studio,
    pays: pays ?? "France", // AFJV = France par défaut (Belgique/Suisse explicitées en catégorie)
    ville,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit (enrichissement) — « Télétravail/Remote » apparaît dans la ville/desc
    contrat,
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut conservateur ; recalculé par le pipeline (classer)
    langue: null, // déduit
    salaire: null, // non fourni par le flux
    publieLe: parseDate(raw.pubDate),
    recupereLe: new Date(),
    description: raw.description ?? null,
    signaux: famille ? { familleMetier: famille } : {},
  };
}
