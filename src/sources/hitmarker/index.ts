/**
 * Connecteur **Hitmarker** (hitmarker.net) — **plus gros board gaming / esport mondial**.
 *
 * Source 🟠 Tier 3 (cf. `SOURCES.md`) : la liste HTML est rendue **en JS** (≈8 offres statiques
 * seulement) et **ne pagine pas par URL** → scraping de la liste = impasse sans navigateur. MAIS
 * deux voies **propres et robustes** existent (vérifié 2026-06) :
 *  1. **`sitemap-jobs.xml`** expose **5000 URLs d'offres** avec `<lastmod>`, **triées du plus récent
 *     au plus ancien** → parfait pour la fraîcheur (on prend les N plus récentes).
 *  2. Chaque **page d'offre** porte un **JSON-LD `JobPosting`** (schema.org) : titre, entreprise,
 *     lieu (locality/region/country), type de contrat, date de publication, description complète.
 *
 * On évite donc **Playwright** : sitemap (1 requête) → N pages d'offres (fetch + extraction JSON-LD,
 * **throttlé** et résilient). Données **normalisées par une norme publique** → bien plus stable que
 * du parsing CSS. Board gaming/esport (pas 100 % craft 3D) → **plancher `connexe`** côté pipeline ;
 * le **titre** promeut le cœur (cf. `classer.ts`).
 */
import { XMLParser } from "fast-xml-parser";
import { load } from "cheerio";
import { z } from "zod";
import type { Offre, Contrat } from "@/domain/offre";

export const SOURCE = "hitmarker";

const SITEMAP_URL = "https://hitmarker.net/sitemap-jobs.xml";
const USER_AGENT =
  "Mozilla/5.0 (compatible; HubEmploi3D/0.1; +job aggregator)";
/** Nb d'offres (les plus récentes) récupérées par run. Plafond de politesse + fraîcheur. */
const MAX_DEFAUT = 150;
/** Pause entre deux fetchs de page d'offre (politesse). */
const THROTTLE_MS = 250;

/** Entrée de sitemap : URL d'offre + date de dernière modif. */
export interface EntreeSitemap {
  loc: string;
  lastmod: string | null;
}

const sitemapParser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (name) => name === "url",
});

/** Parse `sitemap-jobs.xml` → entrées (déjà triées récent→ancien par le site). Testable hors-réseau. */
export function extraireSitemap(xml: string): EntreeSitemap[] {
  const parsed = sitemapParser.parse(xml) as {
    urlset?: { url?: { loc?: unknown; lastmod?: unknown }[] };
  };
  const urls = parsed?.urlset?.url ?? [];
  const out: EntreeSitemap[] = [];
  for (const u of urls) {
    const loc = typeof u.loc === "string" ? u.loc : String(u.loc ?? "");
    if (!loc || !/\/jobs\//.test(loc)) continue;
    out.push({ loc, lastmod: u.lastmod != null ? String(u.lastmod) : null });
  }
  return out;
}

/** Schéma du JSON-LD `JobPosting` (champs utiles ; tolérant aux formes array/objet). */
const Place = z.object({
  address: z
    .object({
      addressLocality: z.coerce.string().optional(),
      addressRegion: z.coerce.string().optional(),
      addressCountry: z.coerce.string().optional(),
    })
    .optional(),
});
export const JobPosting = z.object({
  "@type": z.literal("JobPosting"),
  title: z.coerce.string(),
  description: z.coerce.string().optional(),
  datePosted: z.coerce.string().optional(),
  validThrough: z.coerce.string().optional(),
  employmentType: z.union([z.string(), z.array(z.string())]).optional(),
  jobLocationType: z.coerce.string().optional(),
  hiringOrganization: z
    .union([z.object({ name: z.coerce.string().optional() }), z.string()])
    .optional(),
  jobLocation: z.union([Place, z.array(Place)]).optional(),
});
export type JobPosting = z.infer<typeof JobPosting>;

/** Extrait le 1er bloc JSON-LD `JobPosting` d'une page d'offre. Testable hors-réseau. */
export function parseJobPosting(html: string): JobPosting | null {
  const $ = load(html);
  const blocs = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();
  for (const brut of blocs) {
    let donnee: unknown;
    try {
      donnee = JSON.parse(brut);
    } catch {
      continue;
    }
    // Un bloc peut être un tableau ou un @graph.
    const candidats: unknown[] = Array.isArray(donnee)
      ? donnee
      : donnee && typeof donnee === "object" && "@graph" in donnee
        ? ((donnee as { "@graph": unknown[] })["@graph"] ?? [])
        : [donnee];
    for (const c of candidats) {
      const r = JobPosting.safeParse(c);
      if (r.success) return r.data;
    }
  }
  return null;
}

function mapContrat(type: string | string[] | undefined): Contrat | null {
  if (!type) return null;
  const t = (Array.isArray(type) ? type[0] : type)?.toUpperCase() ?? "";
  if (t.includes("INTERN")) return "stage";
  if (t.includes("CONTRACTOR")) return "freelance";
  if (t.includes("TEMPORARY")) return "CDD";
  if (t.includes("FULL_TIME")) return "CDI";
  return null;
}

const ENTITES: Record<string, string> = {
  "&amp;": "&", "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&euro;": "€",
};

/** Convertit un fragment HTML en texte brut lisible (description JSON-LD). */
function htmlEnTexte(html: string | undefined): string | null {
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

function nomStudio(org: JobPosting["hiringOrganization"]): string | null {
  if (!org) return null;
  if (typeof org === "string") return org || null;
  return org.name ?? null;
}

function premierLieu(loc: JobPosting["jobLocation"]) {
  if (!loc) return undefined;
  return Array.isArray(loc) ? loc[0] : loc;
}

/** Ramène un `JobPosting` (+ son URL d'origine) au type métier `Offre`. */
export function normalize(raw: JobPosting, url: string): Offre {
  // `sourceId` stable = l'id numérique en fin d'URL (…-1724725) ; repli sur le slug complet.
  const apresJobs = url.split("/jobs/")[1] ?? url;
  const id = apresJobs.match(/-(\d+)(?:[/?#].*)?$/)?.[1];
  const sourceId = (id ?? apresJobs).replace(/[/?#].*$/, "").trim();

  const lieu = premierLieu(raw.jobLocation);
  const ville = lieu?.address?.addressLocality ?? null;
  const pays = lieu?.address?.addressCountry ?? null;

  const remote = (raw.jobLocationType ?? "").toUpperCase().includes("REMOTE");

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url,
    titre: raw.title,
    studio: nomStudio(raw.hiringOrganization),
    pays,
    ville,
    latitude: null,
    longitude: null,
    modeTravail: remote ? "remote" : null,
    contrat: mapContrat(raw.employmentType),
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; plancher `connexe` côté collecte (board gaming)
    langue: null, // déduit (contenu EN)
    salaire: null,
    publieLe: parseDate(raw.datePosted),
    recupereLe: new Date(),
    description: htmlEnTexte(raw.description),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Récupère les `max` offres les plus récentes : sitemap → pages d'offres → JSON-LD. */
export async function fetchOffres(
  opts: { max?: number } = {},
): Promise<{ raw: JobPosting; url: string }[]> {
  const max = opts.max ?? MAX_DEFAUT;

  const resSitemap = await fetch(SITEMAP_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/xml" },
  });
  if (!resSitemap.ok) {
    throw new Error(
      `Sitemap Hitmarker inaccessible (${resSitemap.status} ${resSitemap.statusText}).`,
    );
  }
  const entrees = extraireSitemap(await resSitemap.text()).slice(0, max);

  const out: { raw: JobPosting; url: string }[] = [];
  for (const { loc } of entrees) {
    try {
      const res = await fetch(loc, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
      if (res.ok) {
        const jp = parseJobPosting(await res.text());
        if (jp) out.push({ raw: jp, url: loc });
      }
    } catch {
      // Page individuelle en échec → ignorée (résilience), on continue.
    }
    await sleep(THROTTLE_MS);
  }
  return out;
}
