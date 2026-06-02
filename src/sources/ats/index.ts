/**
 * Connecteur **générique ATS** — offres carrière publiées directement par les studios via leur
 * ATS (Greenhouse, Lever, Ashby), **sans clé**, pertinence quasi 100 % (ce sont les offres
 * directes des studios). Cf. `SOURCES.md` Tier 1bis, `RD-TRI.md` §5bis et ADR-0014.
 *
 * Le connecteur est piloté par une **liste curée de studios** (`src/config/studios.ts`). Pour
 * chaque studio, l'adaptateur de sa plateforme récupère le JSON public, le valide (Zod) et le
 * ramène à un format intermédiaire **`OffreAts`** ; `normalize()` produit ensuite l'`Offre` commune.
 *
 * Signal de tri clé : le **département/équipe** (`signaux.departement`) — un studio est 100 % de
 * l'« industrie du jeu » mais PAS 100 % « métier créatif » (il y a du corporate : Finance, Legal,
 * People). Le classifieur promeut les départements **craft** en `coeur` ; le reste reste au
 * **plancher `connexe`** (studio connu = au moins périphérie du secteur), appliqué dans `collect.ts`.
 *
 * Résilient : un studio en échec (404, réseau, schéma) est journalisé et ignoré ; les autres continuent.
 */
import { z } from "zod";
import type { Contrat, Offre } from "@/domain/offre";
import { STUDIOS, type AtsPlateforme, type Studio } from "@/config/studios";
import { nomPays } from "@/lib/pays";

export const SOURCE = "ats";

const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator)";

/** Format intermédiaire commun aux trois plateformes, avant `normalize()`. */
export interface OffreAts {
  ats: AtsPlateforme;
  slug: string;
  studioNom: string;
  id: string;
  titre: string;
  url: string;
  description: string | null;
  /** Localisation lisible (ville / libellé brut de l'ATS). */
  lieu: string | null;
  /** Pays (best-effort, depuis code ISO ou libellé pays de l'ATS). */
  pays: string | null;
  /** Département + équipe concaténés → signal `departement` pour le classifieur. */
  departement: string | null;
  /** Libellé d'engagement brut (FullTime / Internship / Contract…) → mappé en contrat. */
  engagement: string | null;
  /** Travail à distance explicite. */
  remote: boolean | null;
  publieLe: Date | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Décode les entités HTML courantes (Greenhouse encode son `content`). */
function decoderEntites(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Retire les balises HTML et normalise les blancs. Renvoie null si vide. */
function nettoyerHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  const texte = decoderEntites(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return texte || null;
}

/** Premier élément non vide. */
function premier(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) if (v && v.trim()) return v.trim();
  return null;
}

/** Concatène département + équipe en un libellé unique (pour le signal de tri). */
function joindreDept(...parts: (string | null | undefined)[]): string | null {
  const nets = parts.map((p) => p?.trim()).filter((p): p is string => !!p);
  return nets.length ? [...new Set(nets)].join(" · ") : null;
}


function dateOuNull(v: string | number | undefined | null): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Adaptateur Greenhouse — https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
// ---------------------------------------------------------------------------

const GreenhouseJob = z
  .object({
    id: z.coerce.string(),
    title: z.coerce.string(),
    absolute_url: z.string(),
    content: z.string().optional(),
    updated_at: z.string().optional(),
    location: z.object({ name: z.string().optional() }).partial().optional(),
    departments: z.array(z.object({ name: z.string().optional() }).partial()).optional(),
    offices: z.array(z.object({ name: z.string().optional() }).partial()).optional(),
  })
  .passthrough();
const GreenhouseResponse = z.object({ jobs: z.array(z.unknown()).optional() }).passthrough();

async function fetchGreenhouse(studio: Studio): Promise<OffreAts[]> {
  const data = GreenhouseResponse.parse(
    await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${studio.slug}/jobs?content=true`),
  );
  const out: OffreAts[] = [];
  for (const brut of data.jobs ?? []) {
    const r = GreenhouseJob.safeParse(brut);
    if (!r.success) continue;
    const j = r.data;
    out.push({
      ats: "greenhouse", slug: studio.slug, studioNom: studio.nom,
      id: j.id, titre: j.title, url: j.absolute_url,
      description: nettoyerHtml(j.content),
      lieu: premier(j.location?.name, j.offices?.[0]?.name),
      pays: null, // Greenhouse ne donne que la ville
      departement: joindreDept(...(j.departments ?? []).map((d) => d.name)),
      engagement: null,
      remote: /remote/i.test(j.location?.name ?? "") || null,
      publieLe: dateOuNull(j.updated_at),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adaptateur Lever — https://api.lever.co/v0/postings/{slug}?mode=json
// ---------------------------------------------------------------------------

const LeverPosting = z
  .object({
    id: z.coerce.string(),
    text: z.coerce.string(),
    hostedUrl: z.string(),
    descriptionPlain: z.string().optional(),
    createdAt: z.coerce.string().optional(),
    country: z.string().optional(),
    workplaceType: z.string().optional(),
    categories: z
      .object({
        team: z.string().optional(),
        department: z.string().optional(),
        commitment: z.string().optional(),
        location: z.string().optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();

async function fetchLever(studio: Studio): Promise<OffreAts[]> {
  const data = z.array(z.unknown()).parse(
    await fetchJson(`https://api.lever.co/v0/postings/${studio.slug}?mode=json`),
  );
  const out: OffreAts[] = [];
  for (const brut of data) {
    const r = LeverPosting.safeParse(brut);
    if (!r.success) continue;
    const p = r.data;
    out.push({
      ats: "lever", slug: studio.slug, studioNom: studio.nom,
      id: p.id, titre: p.text, url: p.hostedUrl,
      description: p.descriptionPlain?.trim() || null,
      lieu: p.categories?.location ?? null,
      pays: nomPays(p.country),
      departement: joindreDept(p.categories?.department, p.categories?.team),
      engagement: p.categories?.commitment ?? null,
      remote: p.workplaceType ? /remote/i.test(p.workplaceType) : null,
      publieLe: dateOuNull(p.createdAt),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adaptateur Ashby — https://api.ashbyhq.com/posting-api/job-board/{slug}
// ---------------------------------------------------------------------------

const AshbyJob = z
  .object({
    id: z.coerce.string(),
    title: z.coerce.string(),
    jobUrl: z.string(),
    descriptionPlain: z.string().optional(),
    department: z.string().optional(),
    team: z.string().optional(),
    employmentType: z.string().optional(),
    location: z.string().optional(),
    isRemote: z.coerce.boolean().optional(),
    publishedAt: z.string().optional(),
    address: z
      .object({
        postalAddress: z.object({ addressCountry: z.string().optional() }).partial().optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough();
const AshbyResponse = z.object({ jobs: z.array(z.unknown()).optional() }).passthrough();

async function fetchAshby(studio: Studio): Promise<OffreAts[]> {
  const data = AshbyResponse.parse(
    await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${studio.slug}?includeCompensation=true`),
  );
  const out: OffreAts[] = [];
  for (const brut of data.jobs ?? []) {
    const r = AshbyJob.safeParse(brut);
    if (!r.success) continue;
    const j = r.data;
    out.push({
      ats: "ashby", slug: studio.slug, studioNom: studio.nom,
      id: j.id, titre: j.title, url: j.jobUrl,
      description: j.descriptionPlain?.trim() || null,
      lieu: j.location ?? null,
      pays: nomPays(j.address?.postalAddress?.addressCountry),
      departement: joindreDept(j.department, j.team),
      engagement: j.employmentType ?? null,
      remote: j.isRemote ?? null,
      publieLe: dateOuNull(j.publishedAt),
    });
  }
  return out;
}

const ADAPTATEURS: Record<AtsPlateforme, (s: Studio) => Promise<OffreAts[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
};

/**
 * Récupère les offres ATS de la liste de studios (défaut : `STUDIOS`). Un studio en échec est
 * journalisé et ignoré (les autres continuent). Dédup par `${slug}:${id}` (clé déjà unique).
 */
export async function fetchOffres(studios: Studio[] = STUDIOS): Promise<OffreAts[]> {
  const out: OffreAts[] = [];
  for (const studio of studios) {
    try {
      const offres = await ADAPTATEURS[studio.ats](studio);
      out.push(...offres);
    } catch (e) {
      console.warn(`[ats] ${studio.ats}/${studio.slug} ignoré : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

/** Mappe l'engagement ATS vers notre enum contrat (best-effort ; FullTime = durée, pas un type). */
export function mapContrat(engagement: string | null, titre: string): Contrat | null {
  const e = (engagement ?? "").toLowerCase();
  const t = titre.toLowerCase();
  if (/intern|stage|apprentic/.test(e + " " + t)) return "stage";
  if (/contractor|contract\b|freelance/.test(e)) return "freelance";
  if (/temporary|fixed.?term|temp\b/.test(e)) return "CDD";
  if (/permanent|full.?time|regular/.test(e)) return "CDI";
  return null;
}

/** Ramène une `OffreAts` au type métier `Offre`. Le département est transporté comme signal de tri. */
export function normalize(o: OffreAts): Offre {
  return {
    id: `${SOURCE}:${o.slug}:${o.id}`,
    source: SOURCE,
    sourceId: `${o.slug}:${o.id}`,
    url: o.url,
    titre: o.titre,
    studio: o.studioNom,
    pays: o.pays,
    ville: o.lieu,
    latitude: null,
    longitude: null,
    modeTravail: o.remote === true ? "remote" : null,
    contrat: mapContrat(o.engagement, o.titre),
    experience: null, // déduit (enrichissement)
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut conservateur ; recalculé par le pipeline
    langue: null, // déduit
    salaire: null, // compensation ATS non normalisée pour l'instant
    publieLe: o.publieLe,
    recupereLe: new Date(),
    description: o.description,
    signaux: o.departement ? { departement: o.departement } : {},
  };
}
