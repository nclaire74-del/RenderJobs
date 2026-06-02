/**
 * Connecteur **PixelCareer** (pixelcareer.com) — agrégateur **3D / animation / VFX / gaming**, via **RSS**.
 *
 * Source 🟢 (cf. `SOURCES.md`) : flux WordPress des offres `pixelcareer.com/jobs/feed/` (sans clé).
 * Board **curé** niche 3D/anim → plancher `connexe`. `title` = rôle ; le **studio n'est pas structuré**
 * (il apparaît dans le texte de la `description` HTML → laissé `null`, l'enrichissement exploite le texte).
 */
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { Offre } from "@/domain/offre";

export const SOURCE = "pixelcareer";

const FEED_URL = "https://www.pixelcareer.com/jobs/feed/";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator)";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (name) => name === "item",
});

export const RawItemPC = z.object({
  title: z.coerce.string(),
  link: z.coerce.string(),
  description: z.coerce.string().optional(),
  pubDate: z.coerce.string().optional(),
  guid: z.coerce.string().optional(),
});
export type RawItemPC = z.infer<typeof RawItemPC>;

const ENTITES: Record<string, string> = {
  "&amp;": "&", "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&euro;": "€",
};
function stripHtml(html: string | undefined): string | null {
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

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function fetchOffres(): Promise<RawItemPC[]> {
  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml" },
  });
  if (!res.ok) {
    throw new Error(`Flux RSS PixelCareer inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseFlux(await res.text());
}

/** Parse le flux RSS PixelCareer → items valides. Testable hors-réseau. */
export function parseFlux(xml: string): RawItemPC[] {
  const parsed = parser.parse(xml) as { rss?: { channel?: { item?: unknown[] } } };
  const items = parsed?.rss?.channel?.item ?? [];
  const out: RawItemPC[] = [];
  for (const it of items) {
    const r = RawItemPC.safeParse(it);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function normalize(raw: RawItemPC): Offre {
  const url = raw.link || raw.guid || "";
  const sourceId =
    url.replace(/^https?:\/\/[^/]+\//, "").replace(/[?#].*$/, "").replace(/\/+$/, "").trim() || url;

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url,
    titre: raw.title.trim(),
    studio: null, // non structuré (dans le texte de la description)
    pays: null,
    ville: null,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; plancher `connexe` côté collecte (board curé 3D/anim)
    langue: null, // déduit (EN)
    salaire: null,
    publieLe: parseDate(raw.pubDate),
    recupereLe: new Date(),
    description: stripHtml(raw.description),
  };
}
