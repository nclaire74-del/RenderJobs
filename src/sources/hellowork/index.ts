/**
 * Connecteur **HelloWork** (hellowork.com) — généraliste **France**, gros volume.
 *
 * Source 🟠 Tier 2 (cf. `SOURCES.md`) : pas d'API de consommation (le flux JSON HelloWork est
 * réservé aux recruteurs), MAIS (vérifié 2026-06) la **page de recherche est server-rendered** (liens
 * `/fr-fr/emplois/{id}.html`, **sans Cloudflare/captcha**) et chaque **page d'offre** porte un
 * **JSON-LD `JobPosting`** très complet : titre, description, lieu (FR), **salaire €**, type, date, et
 * **`validThrough`** (date d'expiration réelle → on **ignore les offres déjà expirées** = fraîcheur).
 *
 * Méthode (comme Hitmarker, sans Playwright) : pour chaque **requête métier FR**, lire la 1ʳᵉ page de
 * résultats → URLs d'offres (dédupliquées) → fetch de chaque page → JSON-LD. Généraliste FR → **pas de
 * plancher** : le classifieur strict filtre le hors-secteur (« Métrologue 3D » industriel, etc.).
 */
import { load } from "cheerio";
import { z } from "zod";
import type { Offre, Contrat } from "@/domain/offre";
import { nomPays } from "@/lib/pays";

export const SOURCE = "hellowork";

const BASE = "https://www.hellowork.com";
const USER_AGENT =
  "Mozilla/5.0 (compatible; HubEmploi3D/0.1; +job aggregator)";
/** Requêtes métier **FR** (HelloWork est un site français). Net ciblé sur le secteur 3D/jeu/VFX/anim. */
const REQUETES = [
  "jeu vidéo",
  "infographiste 3D",
  "animateur 3D",
  "game designer",
  "modeleur 3D",
  "VFX",
  "motion designer",
  "directeur artistique jeu vidéo",
];
/** Nb max d'offres récupérées par requête (politesse + fraîcheur). */
const MAX_PAR_REQUETE = 25;
const THROTTLE_MS = 200;

/** Schéma (partiel) du JSON-LD `JobPosting` HelloWork. Tolérant aux formes array/objet. */
const Place = z.object({
  address: z
    .object({
      addressLocality: z.coerce.string().optional(),
      addressCountry: z.coerce.string().optional(),
    })
    .optional(),
});
const QuantitativeValue = z.object({
  value: z.coerce.number().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  unitText: z.coerce.string().optional(),
});
export const JobPosting = z.object({
  "@type": z.literal("JobPosting"),
  title: z.coerce.string(),
  description: z.coerce.string().optional(),
  datePosted: z.coerce.string().optional(),
  validThrough: z.coerce.string().optional(),
  employmentType: z.union([z.string(), z.array(z.string())]).optional(),
  hiringOrganization: z
    .union([z.object({ name: z.coerce.string().optional() }), z.string()])
    .optional(),
  jobLocation: z.union([Place, z.array(Place)]).optional(),
  baseSalary: z
    .object({
      currency: z.coerce.string().optional(),
      value: z.union([QuantitativeValue, z.coerce.number()]).optional(),
    })
    .optional(),
});
export type JobPosting = z.infer<typeof JobPosting>;

/** Extrait les URLs d'offres (`/fr-fr/emplois/{id}.html`) d'une page de résultats. Testable hors-réseau. */
export function extraireLiens(html: string): string[] {
  const $ = load(html);
  const vus = new Set<string>();
  $('a[href*="/fr-fr/emplois/"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/\/fr-fr\/emplois\/\d+\.html/);
    if (m) vus.add(BASE + m[0]);
  });
  return [...vus];
}

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
    const candidats: unknown[] = Array.isArray(donnee) ? donnee : [donnee];
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
  // PART_TIME : un temps partiel peut être CDI **ou** CDD → ambigu, on laisse null (pas de faux CDI).
  return null;
}

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

function formaterSalaire(bs: JobPosting["baseSalary"]): string | null {
  if (!bs) return null;
  const devise = bs.currency ?? "EUR";
  const v = bs.value;
  if (typeof v === "number") return `${v} ${devise}`;
  if (!v) return null;
  const unite = v.unitText ? `/${v.unitText.toLowerCase()}` : "";
  if (v.minValue && v.maxValue) return `${v.minValue}-${v.maxValue} ${devise}${unite}`;
  const seul = v.value ?? v.minValue ?? v.maxValue;
  return seul ? `${seul} ${devise}${unite}` : null;
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

/** Ramène un `JobPosting` HelloWork (+ son URL) au type métier `Offre`. */
export function normalize(raw: JobPosting, url: string): Offre {
  const sourceId = url.match(/\/emplois\/(\d+)\.html/)?.[1] ?? url;
  const lieu = premierLieu(raw.jobLocation);

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url,
    titre: raw.title,
    studio: nomStudio(raw.hiringOrganization),
    pays: nomPays(lieu?.address?.addressCountry) ?? "France", // FR par défaut (board FR)
    ville: lieu?.address?.addressLocality ?? null,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit
    contrat: mapContrat(raw.employmentType),
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; pas de plancher (généraliste FR) → classifieur strict
    langue: "fr",
    salaire: formaterSalaire(raw.baseSalary),
    publieLe: parseDate(raw.datePosted),
    recupereLe: new Date(),
    description: htmlEnTexte(raw.description),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `true` si l'offre est déjà expirée (validThrough dépassé) → à ignorer. */
function expiree(raw: JobPosting, maintenant: Date): boolean {
  const vt = parseDate(raw.validThrough);
  return vt != null && vt.getTime() < maintenant.getTime();
}

/** Récupère les offres HelloWork du secteur : recherches FR → pages d'offres → JSON-LD (frais only). */
export async function fetchOffres(): Promise<{ raw: JobPosting; url: string }[]> {
  const maintenant = new Date();
  const urls = new Set<string>();

  // 1. Collecte des URLs d'offres via les recherches métier (1ʳᵉ page chacune).
  for (const q of REQUETES) {
    const u = `${BASE}/fr-fr/emploi/recherche.html?k=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(u, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } });
      if (res.ok) {
        for (const lien of extraireLiens(await res.text()).slice(0, MAX_PAR_REQUETE)) {
          urls.add(lien);
        }
      }
    } catch {
      // recherche en échec → ignorée, on continue (résilience)
    }
    await sleep(THROTTLE_MS);
  }

  // 2. Fetch de chaque page d'offre → JSON-LD (ignore les expirées).
  const out: { raw: JobPosting; url: string }[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } });
      if (res.ok) {
        const jp = parseJobPosting(await res.text());
        if (jp && !expiree(jp, maintenant)) out.push({ raw: jp, url });
      }
    } catch {
      // page en échec → ignorée
    }
    await sleep(THROTTLE_MS);
  }
  return out;
}
