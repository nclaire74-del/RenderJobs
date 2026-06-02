/**
 * Connecteur **Remotive** (remotive.com) — board **remote**, API JSON publique sans clé.
 *
 * Source 🟢 Tier 1ter (cf. `SOURCES.md`) : `/api/remote-jobs?category=design` cible la catégorie
 * **design**. **Attribution requise** (on lie vers l'offre → conforme). Généraliste → **pas de
 * plancher** : le classifieur strict filtre. Champs : titre, société, lieu, type, date, desc, tags.
 */
import { z } from "zod";
import type { Offre } from "@/domain/offre";

export const SOURCE = "remotive";

const API_URL = "https://remotive.com/api/remote-jobs?category=design&limit=50";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator; attribution honored)";

export const RawJobRemotive = z.object({
  id: z.coerce.string(),
  url: z.coerce.string().optional(),
  title: z.coerce.string(),
  company_name: z.coerce.string().optional(),
  candidate_required_location: z.coerce.string().optional(),
  tags: z.array(z.coerce.string()).optional(),
  publication_date: z.coerce.string().optional(),
  salary: z.coerce.string().optional(),
  description: z.coerce.string().optional(),
});
export type RawJobRemotive = z.infer<typeof RawJobRemotive>;

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

export async function fetchOffres(): Promise<RawJobRemotive[]> {
  const res = await fetch(API_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API Remotive inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseReponse(await res.json());
}

/** Parse la réponse Remotive (`{ jobs: [...] }`) → jobs valides. Testable hors-réseau. */
export function parseReponse(data: unknown): RawJobRemotive[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: RawJobRemotive[] = [];
  for (const item of jobs) {
    const r = RawJobRemotive.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function normalize(raw: RawJobRemotive): Offre {
  const desc = htmlEnTexte(raw.description);
  const tags = raw.tags?.length ? `Tags : ${raw.tags.join(", ")}.` : null;
  const description = [desc, tags].filter(Boolean).join("\n") || null;

  return {
    id: `${SOURCE}:${raw.id}`,
    source: SOURCE,
    sourceId: raw.id,
    url: raw.url || `https://remotive.com/remote-jobs/${raw.id}`,
    titre: raw.title,
    studio: raw.company_name ?? null,
    pays: null,
    ville: raw.candidate_required_location || null,
    latitude: null,
    longitude: null,
    modeTravail: "remote",
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; pas de plancher (généraliste) → classifieur strict
    langue: null, // déduit (EN)
    salaire: raw.salary?.trim() || null,
    publieLe: parseDate(raw.publication_date),
    recupereLe: new Date(),
    description,
  };
}
