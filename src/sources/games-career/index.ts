/**
 * Connecteur **Games-Career.com** — flux **RSS** public (jeu vidéo, Europe / Allemagne forte).
 *
 * Source 🟢 Tier 1 (cf. `SOURCES.md`) : flux global ouvert `games-career.com/rss/Joboffer`
 * (sans clé). Board **curé jeu vidéo** → plancher `connexe` appliqué côté pipeline (comme AFJV).
 *
 * Particularités utiles :
 * - `title` au format « <Studio>: <Rôle> » → on sépare sur le premier « : ».
 * - **`content:encoded`** porte la **description HTML complète** (riche, ~5 k car.) → on la nettoie
 *   en texte brut : excellente matière pour l'enrichissement (logiciels/spécialités/niveau).
 * - `guid` stable (ex. `gc_33706`) → `sourceId`. Pas de lieu/contrat structurés dans le flux
 *   (déduits par l'enrichissement à partir du texte).
 *
 * Contenu majoritairement **anglophone** → valide aussi l'enrichissement bilingue (langue `en`).
 */
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { Offre } from "@/domain/offre";

export const SOURCE = "games-career";

const FEED_URL = "https://www.games-career.com/rss/Joboffer";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator)";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (name) => name === "item",
});

/** Item brut du flux RSS Games-Career (la clé `content:encoded` est namespacée). */
export const RawItemGC = z.object({
  title: z.coerce.string(),
  link: z.coerce.string(),
  description: z.coerce.string().optional(),
  pubDate: z.coerce.string().optional(),
  guid: z.coerce.string().optional(),
  "content:encoded": z.coerce.string().optional(),
});
export type RawItemGC = z.infer<typeof RawItemGC>;

const ENTITES: Record<string, string> = {
  "&amp;": "&", "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&euro;": "€",
};

/** Convertit un fragment HTML en texte brut lisible (pour l'enrichissement et l'affichage). */
export function stripHtml(html: string | undefined): string | null {
  if (!html) return null;
  const texte = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;|&#\d+;/gi, (e) => ENTITES[e.toLowerCase()] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
  return texte || null;
}

/** Sépare « <Studio>: <Rôle> » → { studio, titre }. Si pas de séparateur, tout va dans le titre. */
export function lireTitre(brut: string): { studio: string | null; titre: string } {
  const i = brut.indexOf(": ");
  if (i === -1) return { studio: null, titre: brut.trim() };
  return { studio: brut.slice(0, i).trim() || null, titre: brut.slice(i + 2).trim() };
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Récupère et parse le flux RSS Games-Career. */
export async function fetchOffres(): Promise<RawItemGC[]> {
  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml" },
  });
  if (!res.ok) {
    throw new Error(`Flux RSS Games-Career inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseFlux(await res.text());
}

/** Parse un flux RSS Games-Career (string) → items bruts valides. Testable hors-réseau. */
export function parseFlux(xml: string): RawItemGC[] {
  const parsed = parser.parse(xml) as { rss?: { channel?: { item?: unknown[] } } };
  const items = parsed?.rss?.channel?.item ?? [];
  const out: RawItemGC[] = [];
  for (const it of items) {
    const r = RawItemGC.safeParse(it);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** Ramène un item RSS Games-Career au type métier `Offre`. */
export function normalize(raw: RawItemGC): Offre {
  const { studio, titre } = lireTitre(raw.title);
  const sourceId = (raw.guid || raw.link).trim();
  // Description riche : on préfère le HTML complet (content:encoded), nettoyé en texte.
  const description = stripHtml(raw["content:encoded"]) ?? raw.description ?? null;

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url: raw.link,
    titre,
    studio,
    pays: null, // international (EU/DE fort) ; non structuré dans le flux
    ville: null,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit
    contrat: null, // déduit / absent du flux
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; recalculé par le pipeline (avec plancher côté collecte)
    langue: null, // déduit (souvent `en`)
    salaire: null,
    publieLe: parseDate(raw.pubDate),
    recupereLe: new Date(),
    description,
  };
}
