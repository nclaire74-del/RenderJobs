/**
 * Connecteur **Jobicy** (jobicy.com) — board **remote**, API JSON v2 publique sans clé.
 *
 * Source 🟢 Tier 1ter (cf. `SOURCES.md`) : `/api/v2/remote-jobs?industry=design-multimedia` cible
 * l'industrie **création/multimédia** (plus pertinente que le tout-venant remote). **Attribution
 * demandée** (on lie vers l'offre → conforme). Généraliste → **pas de plancher** : le classifieur
 * strict filtre. Données riches : titre, société, lieu (`jobGeo`), niveau (`jobLevel`), **salaire**.
 */
import { z } from "zod";
import type { Offre, Experience } from "@/domain/offre";

export const SOURCE = "jobicy";

const API_URL =
  "https://jobicy.com/api/v2/remote-jobs?count=50&industry=design-multimedia";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator; attribution honored)";

export const RawJobJobicy = z.object({
  id: z.coerce.string(),
  url: z.coerce.string().optional(),
  jobTitle: z.coerce.string(),
  companyName: z.coerce.string().optional(),
  jobGeo: z.coerce.string().optional(),
  jobType: z.union([z.string(), z.array(z.string())]).optional(),
  jobLevel: z.coerce.string().optional(),
  jobExcerpt: z.coerce.string().optional(),
  jobDescription: z.coerce.string().optional(),
  pubDate: z.coerce.string().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  salaryCurrency: z.coerce.string().optional(),
});
export type RawJobJobicy = z.infer<typeof RawJobJobicy>;

const ENTITES: Record<string, string> = {
  "&amp;": "&", "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&euro;": "€",
};
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

/** Mappe le niveau Jobicy → notre enum `Experience`. */
export function mapExperience(niveau: string | undefined): Experience | null {
  if (!niveau) return null;
  const n = niveau.toLowerCase();
  if (n.includes("senior")) return "senior";
  if (n.includes("lead") || n.includes("manager") || n.includes("principal")) return "lead";
  if (n.includes("junior") || n.includes("entry")) return "junior";
  if (n.includes("mid")) return "confirme";
  return null;
}

function formaterSalaire(min: number | undefined, max: number | undefined, devise: string | undefined): string | null {
  const d = devise || "USD";
  if (min && max) return `${min}-${max} ${d}`;
  const seul = min || max;
  return seul ? `${seul} ${d}` : null;
}

export async function fetchOffres(): Promise<RawJobJobicy[]> {
  const res = await fetch(API_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API Jobicy inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseReponse(await res.json());
}

/** Parse la réponse Jobicy (`{ jobs: [...] }`) → jobs valides. Testable hors-réseau. */
export function parseReponse(data: unknown): RawJobJobicy[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: RawJobJobicy[] = [];
  for (const item of jobs) {
    const r = RawJobJobicy.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function normalize(raw: RawJobJobicy): Offre {
  const desc = htmlEnTexte(raw.jobDescription) ?? htmlEnTexte(raw.jobExcerpt);

  return {
    id: `${SOURCE}:${raw.id}`,
    source: SOURCE,
    sourceId: raw.id,
    url: raw.url || `https://jobicy.com/jobs/${raw.id}`,
    titre: raw.jobTitle,
    studio: raw.companyName ?? null,
    pays: null,
    ville: raw.jobGeo || null, // « UK », « Anywhere »… (texte libre)
    latitude: null,
    longitude: null,
    modeTravail: "remote", // board 100 % remote
    contrat: null, // déduit (jobType peu normalisé)
    experience: mapExperience(raw.jobLevel),
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; pas de plancher (généraliste) → classifieur strict
    langue: null, // déduit (EN)
    salaire: formaterSalaire(raw.salaryMin, raw.salaryMax, raw.salaryCurrency),
    publieLe: parseDate(raw.pubDate),
    recupereLe: new Date(),
    description: desc,
  };
}
