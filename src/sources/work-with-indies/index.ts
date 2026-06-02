/**
 * Connecteur **Work With Indies** (workwithindies.com) — board **jeux indépendants**, via **RSS**.
 *
 * Source 🟢 (cf. `SOURCES.md`) : flux `workwithindies.com/careers/rss.xml` (100 items, sans clé).
 * Board **curé jeu indé** → plancher `connexe` (comme AFJV/Games-Career). Titre au format
 * « <Studio> is hiring a/an <Rôle>… » ; la `description` porte un résumé + des **tags** entre crochets
 * (« [Art & Animation] [Part Time] ») → bonne matière pour l'enrichissement.
 */
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { Offre } from "@/domain/offre";

export const SOURCE = "work-with-indies";

const FEED_URL = "https://workwithindies.com/careers/rss.xml";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator)";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (name) => name === "item",
});

export const RawItemWWI = z.object({
  title: z.coerce.string(),
  link: z.coerce.string(),
  description: z.coerce.string().optional(),
  pubDate: z.coerce.string().optional(),
  guid: z.coerce.string().optional(),
});
export type RawItemWWI = z.infer<typeof RawItemWWI>;

/**
 * Sépare « <Studio> is hiring a/an <Rôle>… » → { studio, titre }. Coupe les préambules de lieu
 * fréquents (« to work from… », « to join… »). Si le motif n'est pas reconnu, tout va dans le titre.
 */
export function lireTitre(brut: string): { studio: string | null; titre: string } {
  const m = brut.match(/^(.*?)\s+is hiring\s+(?:an?\s+)?(.+)$/i);
  if (!m) return { studio: null, titre: brut.trim() };
  const studio = m[1].trim() || null;
  const role = m[2].replace(/\s+(?:to work|to join|to help|based|remotely|remote\b).*$/i, "").trim();
  return { studio, titre: role || m[2].trim() };
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function fetchOffres(): Promise<RawItemWWI[]> {
  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml" },
  });
  if (!res.ok) {
    throw new Error(`Flux RSS Work With Indies inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseFlux(await res.text());
}

/** Parse le flux RSS Work With Indies → items valides. Testable hors-réseau. */
export function parseFlux(xml: string): RawItemWWI[] {
  const parsed = parser.parse(xml) as { rss?: { channel?: { item?: unknown[] } } };
  const items = parsed?.rss?.channel?.item ?? [];
  const out: RawItemWWI[] = [];
  for (const it of items) {
    const r = RawItemWWI.safeParse(it);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function normalize(raw: RawItemWWI): Offre {
  const { studio, titre } = lireTitre(raw.title);
  const url = raw.link || raw.guid || "";
  const sourceId =
    url.replace(/^https?:\/\/[^/]+\//, "").replace(/[?#].*$/, "").replace(/\/+$/, "").trim() || url;

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url,
    titre,
    studio,
    pays: null,
    ville: null,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit (beaucoup de remote indé ; non structuré)
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; plancher `connexe` côté collecte (board curé indé)
    langue: null, // déduit (EN)
    salaire: null,
    publieLe: parseDate(raw.pubDate),
    recupereLe: new Date(),
    description: raw.description ?? null,
  };
}
