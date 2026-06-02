/**
 * Connecteur **ArtStation** (artstation.com/jobs) — **plus gros board art** games/film (cible n°1).
 *
 * Source 🔴→🟢 (cf. `SOURCES.md`, ADR-0026) : la **page** est protégée Cloudflare, MAIS son **API JSON
 * publique** `api/v2/jobs/public/jobs.json` répond **en direct** (vérifié 2026-06, HTTP 200 sans proxy ni
 * navigateur). Données riches : titre, description, skills, société, type, niveau, **remote**, **salaire**,
 * lieu (`recruitment_localities`), date. Board **curé art/création** (games/film) → plancher `connexe` ;
 * le cœur 3D est promu par le titre (3D/Environment/Character Artist…), l'illustration/concept reste connexe.
 *
 * ⚠️ Si Cloudflare se met à bloquer l'API en direct, router le `fetch` via la brique navigateur
 * (`src/lib/navigateur.ts`) — l'API a déjà répondu sous Chromium headless (cf. ADR-0026).
 */
import { z } from "zod";
import type { Offre, Contrat, Experience } from "@/domain/offre";

export const SOURCE = "artstation";

const API = "https://www.artstation.com/api/v2/jobs/public/jobs.json";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const PER_PAGE = 50;
const MAX_PAGES = 6; // garde-fou (≈90 offres aujourd'hui → 2 pages ; marge pour la croissance)

const Locality = z.object({
  locality: z
    .object({
      country_name: z.coerce.string().optional(),
      city_name: z.coerce.string().optional(),
    })
    .optional(),
});
const SalaryRange = z.object({
  min_salary: z.coerce.number().nullish(),
  max_salary: z.coerce.number().nullish(),
  currency: z.coerce.string().nullish(),
  period: z.coerce.string().nullish(),
});
export const RawJobAS = z.object({
  hash_id: z.coerce.string(),
  title: z.coerce.string(),
  description: z.coerce.string().optional(),
  about: z.coerce.string().optional(),
  skills: z.coerce.string().optional(),
  company_name: z.coerce.string().optional(),
  job_type: z.coerce.string().optional(),
  level: z.coerce.string().optional(),
  work_remotely: z.coerce.boolean().optional(),
  created_at: z.coerce.string().optional(),
  salary_range: SalaryRange.nullish(),
  recruitment_localities: z.array(Locality).optional(),
});
export type RawJobAS = z.infer<typeof RawJobAS>;

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

function mapContrat(t: string | undefined): Contrat | null {
  if (!t) return null;
  const s = t.toLowerCase();
  if (s.includes("intern")) return "stage";
  if (s.includes("freelance") || s.includes("contract")) return "freelance";
  if (s.includes("temporary")) return "CDD";
  if (s.includes("permanent") || s.includes("full")) return "CDI";
  return null;
}

/** Mappe le niveau ArtStation → `Experience`. */
export function mapLevel(l: string | undefined): Experience | null {
  if (!l) return null;
  const s = l.toLowerCase();
  if (s.includes("senior")) return "senior";
  if (s.includes("lead") || s.includes("principal") || s.includes("director")) return "lead";
  if (s.includes("entry") || s.includes("junior")) return "junior";
  if (s.includes("mid") || s.includes("middle")) return "confirme";
  return null;
}

function formaterSalaire(sr: RawJobAS["salary_range"]): string | null {
  if (!sr) return null;
  const min = sr.min_salary ?? undefined;
  const max = sr.max_salary ?? undefined;
  if (!min && !max) return null;
  const dev = sr.currency || "USD";
  const per = sr.period ? `/${sr.period}` : "";
  if (min && max) return `${min}-${max} ${dev}${per}`;
  return `${min ?? max} ${dev}${per}`;
}

/** Parse une réponse de page (`{ data: [...] }`) → jobs valides. Testable hors-réseau. */
export function parseReponse(data: unknown): RawJobAS[] {
  const arr = (data as { data?: unknown[] })?.data;
  if (!Array.isArray(arr)) return [];
  const out: RawJobAS[] = [];
  for (const item of arr) {
    const r = RawJobAS.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** Récupère les offres ArtStation via l'API publique paginée. */
export async function fetchOffres(): Promise<RawJobAS[]> {
  const out: RawJobAS[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${API}?page=${page}&per_page=${PER_PAGE}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) {
      if (page === 1) throw new Error(`API ArtStation inaccessible (${res.status} ${res.statusText}).`);
      break; // page suivante en échec → on s'arrête proprement avec ce qu'on a
    }
    const lot = parseReponse(await res.json());
    out.push(...lot);
    if (lot.length < PER_PAGE) break; // dernière page atteinte
  }
  return out;
}

/** Ramène un job ArtStation au type métier `Offre`. */
export function normalize(raw: RawJobAS): Offre {
  const pays = raw.recruitment_localities?.[0]?.locality?.country_name ?? null;
  const ville = raw.recruitment_localities?.[0]?.locality?.city_name ?? null;
  const description =
    [htmlEnTexte(raw.description), htmlEnTexte(raw.about), raw.skills?.trim() || null]
      .filter(Boolean)
      .join("\n") || null;

  return {
    id: `${SOURCE}:${raw.hash_id}`,
    source: SOURCE,
    sourceId: raw.hash_id,
    url: `https://www.artstation.com/jobs/${raw.hash_id}`,
    titre: raw.title,
    studio: raw.company_name ?? null,
    pays,
    ville,
    latitude: null,
    longitude: null,
    modeTravail: raw.work_remotely ? "remote" : null,
    contrat: mapContrat(raw.job_type),
    experience: mapLevel(raw.level),
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; plancher `connexe` côté collecte (board curé art games/film)
    langue: null, // déduit (EN)
    salaire: formaterSalaire(raw.salary_range),
    publieLe: parseDate(raw.created_at),
    recupereLe: new Date(),
    description,
  };
}
