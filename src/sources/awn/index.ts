/**
 * Connecteur **AWN — Animation World Network** (jobs.awn.com) — board **animation / film / VFX** (US fort).
 *
 * Source 🔴→🟢 (cf. `SOURCES.md`, ADR-0026) : la liste est protégée **Cloudflare** (curl → 403) et
 * rendue après JS → on passe par la **brique navigateur** (`src/lib/navigateur.ts`, Chromium headless).
 * Le HTML rendu contient des cartes `.job-main-data` → parsing **cheerio**.
 *
 * AWN est un board **large de l'industrie animation/média** : il porte aussi des postes TV/diffusion
 * généralistes (« Content Producer » chez un broadcaster) → **pas de plancher** (comme Hitmarker) : le
 * classifieur strict filtre, le cœur 3D/anim/VFX est promu par le titre.
 */
import { load } from "cheerio";
import { z } from "zod";
import type { Offre } from "@/domain/offre";
import { htmlRendu } from "@/lib/navigateur";

export const SOURCE = "awn";

const LISTING_URL = "https://jobs.awn.com/jobs";
const BASE = "https://jobs.awn.com";

/** Schéma de l'offre brute extraite d'une carte `.job-main-data` AWN (validation Zod de la donnée externe). */
const RawJobAWNSchema = z.object({
  url: z.string().min(1),
  titre: z.string().min(1),
  studio: z.string().nullable(),
  lieu: z.string().nullable(),
  sourceId: z.string().min(1),
});
export type RawJobAWN = z.infer<typeof RawJobAWNSchema>;

function compact(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Parse le HTML rendu de la liste AWN → offres brutes. Testable hors-réseau. */
export function parseListe(html: string): RawJobAWN[] {
  const $ = load(html);
  const out: RawJobAWN[] = [];
  const vus = new Set<string>();

  $(".job-main-data").each((_, el) => {
    const bloc = $(el);
    const lien = bloc.find(".job-title a[href]").first();
    const href = lien.attr("href") ?? "";
    const m = href.match(/\/job\/[a-z0-9-]+\/(\d+)\/?/i);
    if (!m) return; // pas une vraie offre

    const sourceId = m[1];
    if (vus.has(sourceId)) return;
    vus.add(sourceId);

    const titre = compact(lien.attr("title") || lien.text());
    if (!titre) return;
    const studio = compact(bloc.find(".job-company-row").first().text()) || null;
    const lieu = compact(bloc.find(".job-location").first().text()) || null;

    const valide = RawJobAWNSchema.safeParse({
      url: href.startsWith("http") ? href : BASE + href,
      titre,
      studio,
      lieu,
      sourceId,
    });
    if (valide.success) out.push(valide.data);
  });

  return out;
}

/** Récupère la liste AWN (via navigateur headless → Cloudflare/JS) puis la parse. */
export async function fetchOffres(): Promise<RawJobAWN[]> {
  const html = await htmlRendu(LISTING_URL, { attendreMs: 4000 });
  return parseListe(html);
}

/** Ramène une offre brute AWN au type métier `Offre`. */
export function normalize(raw: RawJobAWN): Offre {
  return {
    id: `${SOURCE}:${raw.sourceId}`,
    source: SOURCE,
    sourceId: raw.sourceId,
    url: raw.url,
    titre: raw.titre,
    studio: raw.studio,
    pays: null,
    ville: raw.lieu, // texte libre (« Los Angeles, California, USA »)
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; pas de plancher (board large média/anim) → classifieur strict
    langue: null, // déduit (EN)
    salaire: null,
    publieLe: null, // pas de date fiable dans la liste
    recupereLe: new Date(),
    description: null, // liste seule (titre suffit au tri ; détail possible plus tard)
  };
}
