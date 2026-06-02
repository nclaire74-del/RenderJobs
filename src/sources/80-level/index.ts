/**
 * Connecteur **80 Level** (80.lv) — board **art / tech jeu**, qualitatif.
 *
 * Source 🟠→🟢 (cf. `SOURCES.md`) : la page `/jobs/` est une **app Next.js** ; les offres sont dans le
 * **JSON embarqué** `__NEXT_DATA__` (`props.initialState.jobBoard.data.jobs.items`) → parsable **sans
 * navigateur**. La page n'expose que les ~10 plus récentes (sur 70) → suffisant en collecte fréquente.
 * Board **curé** art/tech jeu → plancher `connexe`. Chaque item : titre, `company.title`, `city`,
 * `country`, `tags[]`, `date` (humaine), `description` HTML, `slug` → URL `80.lv/jobs/{slug}`.
 */
import { load } from "cheerio";
import { z } from "zod";
import type { Offre } from "@/domain/offre";

export const SOURCE = "80-level";

const LISTING_URL = "https://80.lv/jobs/";
const USER_AGENT =
  "Mozilla/5.0 (compatible; HubEmploi3D/0.1; +job aggregator)";

const Tag = z.object({ name: z.coerce.string().optional() });
export const RawJob80 = z.object({
  id: z.coerce.string(),
  slug: z.coerce.string().optional(),
  title: z.coerce.string(),
  date: z.coerce.string().optional(),
  description: z.coerce.string().optional(),
  tags: z.array(Tag).optional(),
  company: z
    .union([z.object({ title: z.coerce.string().optional() }), z.string()])
    .optional(),
  city: z.coerce.string().nullish(),
  country: z.coerce.string().nullish(),
});
export type RawJob80 = z.infer<typeof RawJob80>;

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

function nomStudio(c: RawJob80["company"]): string | null {
  if (!c) return null;
  if (typeof c === "string") return c || null;
  return c.title ?? null;
}

/** Extrait les offres du JSON `__NEXT_DATA__` de la page 80 Level. Testable hors-réseau. */
export function parseEtat(html: string): RawJob80[] {
  const $ = load(html);
  const brut = $("#__NEXT_DATA__").first().text();
  if (!brut) return [];
  let data: unknown;
  try {
    data = JSON.parse(brut);
  } catch {
    return [];
  }
  const items =
    (data as { props?: { initialState?: { jobBoard?: { data?: { jobs?: { items?: unknown[] } } } } } })
      ?.props?.initialState?.jobBoard?.data?.jobs?.items ?? [];
  const out: RawJob80[] = [];
  for (const it of items) {
    const r = RawJob80.safeParse(it);
    if (r.success) out.push(r.data);
  }
  return out;
}

export async function fetchOffres(): Promise<RawJob80[]> {
  const res = await fetch(LISTING_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`80 Level inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseEtat(await res.text());
}

export function normalize(raw: RawJob80): Offre {
  const sourceId = raw.id;
  const url = raw.slug ? `https://80.lv/jobs/${raw.slug}` : LISTING_URL;
  const tags = raw.tags?.map((t) => t.name).filter(Boolean) ?? [];
  const desc = stripHtml(raw.description);
  const tagsTxt = tags.length ? `Tags : ${tags.join(", ")}.` : null;
  const description = [desc, tagsTxt].filter(Boolean).join("\n") || null;

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url,
    titre: raw.title.trim(),
    studio: nomStudio(raw.company),
    pays: raw.country ?? null,
    ville: raw.city ?? null,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; plancher `connexe` côté collecte (board curé art/tech jeu)
    langue: null, // déduit (EN)
    salaire: null,
    publieLe: parseDate(raw.date),
    recupereLe: new Date(),
    description,
  };
}
