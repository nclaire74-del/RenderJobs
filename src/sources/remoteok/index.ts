/**
 * Connecteur **RemoteOK** (remoteok.com) — board **100 % remote**, API JSON publique sans clé.
 *
 * Source 🟢 Tier 1ter (cf. `SOURCES.md`) : `remoteok.com/api?tags=design` renvoie un tableau JSON
 * (le **1er élément est une mention légale** sans `id` → ignoré). **Attribution requise** (on lie
 * toujours vers l'offre d'origine → conforme). Généraliste tech/design → **pas de plancher** : le
 * classifieur strict filtre (densité 3D faible mais ajoute du volume créatif/remote international).
 *
 * Champs utiles : `position` (titre), `company`, `location`, `tags[]`, `description` (HTML), `date`,
 * `url`, `salary_min`/`salary_max` (souvent 0 → null). `modeTravail` = **remote** (board remote).
 */
import { z } from "zod";
import type { Offre } from "@/domain/offre";

export const SOURCE = "remoteok";

const API_URL = "https://remoteok.com/api?tags=design";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator; attribution honored)";

/** Élément brut de l'API RemoteOK (un job ; la mention légale n'a pas d'`id`). */
export const RawJobROK = z.object({
  id: z.coerce.string(),
  position: z.coerce.string().optional(),
  company: z.coerce.string().optional(),
  location: z.coerce.string().optional(),
  tags: z.array(z.coerce.string()).optional(),
  description: z.coerce.string().optional(),
  date: z.coerce.string().optional(),
  url: z.coerce.string().optional(),
  apply_url: z.coerce.string().optional(),
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
});
export type RawJobROK = z.infer<typeof RawJobROK>;

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

function formaterSalaire(min: number | undefined, max: number | undefined): string | null {
  if (min && max) return `${min}-${max} USD`;
  const seul = min || max;
  return seul ? `${seul} USD` : null;
}

/** Récupère et valide le flux JSON RemoteOK. */
export async function fetchOffres(): Promise<RawJobROK[]> {
  const res = await fetch(API_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API RemoteOK inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseReponse(await res.json());
}

/** Parse la réponse RemoteOK (déjà désérialisée) → jobs valides. Testable hors-réseau. */
export function parseReponse(data: unknown): RawJobROK[] {
  if (!Array.isArray(data)) return [];
  const out: RawJobROK[] = [];
  for (const item of data) {
    const r = RawJobROK.safeParse(item);
    if (r.success && r.data.position) out.push(r.data); // ignore la mention légale (sans position)
  }
  return out;
}

/** Ramène un job RemoteOK au type métier `Offre`. */
export function normalize(raw: RawJobROK): Offre {
  // Description enrichie des tags (matière pour l'enrichissement logiciels/spécialités).
  const desc = htmlEnTexte(raw.description);
  const tags = raw.tags?.length ? `Tags : ${raw.tags.join(", ")}.` : null;
  const description = [desc, tags].filter(Boolean).join("\n") || null;

  return {
    id: `${SOURCE}:${raw.id}`,
    source: SOURCE,
    sourceId: raw.id,
    url: raw.url || raw.apply_url || `https://remoteok.com/remote-jobs/${raw.id}`,
    titre: raw.position ?? "",
    studio: raw.company ?? null,
    pays: null,
    ville: raw.location || null,
    latitude: null,
    longitude: null,
    modeTravail: "remote", // board 100 % remote
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; pas de plancher (généraliste) → classifieur strict
    langue: null, // déduit (EN)
    salaire: formaterSalaire(raw.salary_min, raw.salary_max),
    publieLe: parseDate(raw.date),
    recupereLe: new Date(),
    description,
  };
}
