/**
 * Connecteur **GrackleHQ** (gracklehq.com) — **agrégateur jeu vidéo** (4000+ offres revendiquées).
 *
 * Source 🔴→🟢 (cf. `SOURCES.md`, ADR-0026) : app JS (ASP.NET), liste rendue après JS → **brique
 * navigateur** (`src/lib/navigateur.ts`). Le HTML rendu expose des cartes `.joblisting` :
 *   `<div class="joblisting"><a href="/rd/{id}">{Titre}</a><div>{Société} - {Lieu}</div>…</div>`
 * Le lien `/rd/{id}` **redirige** vers l'annonce d'origine (attribution conservée). On récupère le
 * **lot récent** affiché (≈30). Board **curé jeu vidéo** → plancher `connexe` ; cœur promu par le titre.
 */
import { load } from "cheerio";
import type { Offre } from "@/domain/offre";
import { htmlRendu } from "@/lib/navigateur";

export const SOURCE = "gracklehq";

const LISTING_URL = "https://gracklehq.com/jobs";
const BASE = "https://gracklehq.com";

export interface RawJobGrackle {
  url: string;
  titre: string;
  studio: string | null;
  lieu: string | null;
  sourceId: string;
}

function compact(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Sépare « Société - Lieu » (1er « - »). Sans séparateur → tout en studio. */
export function lireSocieteLieu(brut: string): { studio: string | null; lieu: string | null } {
  const t = compact(brut);
  if (!t) return { studio: null, lieu: null };
  const i = t.indexOf(" - ");
  if (i === -1) return { studio: t, lieu: null };
  return { studio: t.slice(0, i).trim() || null, lieu: t.slice(i + 3).trim() || null };
}

/** Parse le HTML rendu de la liste GrackleHQ → offres brutes. Testable hors-réseau. */
export function parseListe(html: string): RawJobGrackle[] {
  const $ = load(html);
  const out: RawJobGrackle[] = [];
  const vus = new Set<string>();

  $(".joblisting").each((_, el) => {
    const bloc = $(el);
    const lien = bloc.find('a[href*="/rd/"]').first();
    const href = lien.attr("href") ?? "";
    const m = href.match(/\/rd\/(\d+)/);
    if (!m) return;
    const sourceId = m[1];
    if (vus.has(sourceId)) return;
    vus.add(sourceId);

    const titre = compact(lien.text());
    if (!titre) return;
    const { studio, lieu } = lireSocieteLieu(bloc.find("div").not(".bottomright").first().text());

    out.push({
      url: href.startsWith("http") ? href : BASE + href,
      titre,
      studio,
      lieu,
      sourceId,
    });
  });

  return out;
}

/** Récupère la liste GrackleHQ (via navigateur headless) puis la parse. */
export async function fetchOffres(): Promise<RawJobGrackle[]> {
  const html = await htmlRendu(LISTING_URL, { attendreMs: 5000 });
  return parseListe(html);
}

/** Ramène une offre brute GrackleHQ au type métier `Offre`. */
export function normalize(raw: RawJobGrackle): Offre {
  return {
    id: `${SOURCE}:${raw.sourceId}`,
    source: SOURCE,
    sourceId: raw.sourceId,
    url: raw.url, // /rd/{id} → redirige vers l'annonce d'origine (attribution)
    titre: raw.titre,
    studio: raw.studio,
    pays: null,
    ville: raw.lieu,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; plancher `connexe` côté collecte (agrégateur jeu vidéo curé)
    langue: null, // déduit (EN)
    salaire: null,
    publieLe: null, // ancienneté relative seulement (« <1d ») → non parsée
    recupereLe: new Date(),
    description: null,
  };
}
