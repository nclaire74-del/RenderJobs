/**
 * Connecteur **GameJobs.co** — board **game dev** (fort en remote), via **flux Atom**.
 *
 * Source 🟢 (cf. `SOURCES.md`) : `gamejobs.co/?format=atom` expose **100 entrées** sans clé. Le flux
 * est **minimal** (titre, id=URL, date `updated` ; pas de description ni catégorie) → l'enrichissement
 * se fait sur le **titre** seul, qui est riche : « <Rôle> at <Studio> » (parfois « <Rôle> - <Variante>
 * at <Studio> »). Board **curé game dev** → plancher `connexe` côté pipeline (comme AFJV/Games-Career).
 */
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { Offre } from "@/domain/offre";

export const SOURCE = "gamejobs-co";

const FEED_URL = "https://gamejobs.co/?format=atom";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator)";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (name) => name === "entry",
});

/** Entrée brute du flux Atom GameJobs.co. */
export const RawEntryGJC = z.object({
  title: z.coerce.string(),
  id: z.coerce.string(), // = URL canonique de l'offre
  updated: z.coerce.string().optional(),
});
export type RawEntryGJC = z.infer<typeof RawEntryGJC>;

/** Sépare « <Rôle> at <Studio> » → { studio, titre }. Coupe sur le **dernier** « at ». */
export function lireTitre(brut: string): { studio: string | null; titre: string } {
  const i = brut.toLowerCase().lastIndexOf(" at ");
  if (i === -1) return { studio: null, titre: brut.trim() };
  return { titre: brut.slice(0, i).trim(), studio: brut.slice(i + 4).trim() || null };
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Récupère et parse le flux Atom GameJobs.co. */
export async function fetchOffres(): Promise<RawEntryGJC[]> {
  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/atom+xml, application/xml" },
  });
  if (!res.ok) {
    throw new Error(`Flux Atom GameJobs.co inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseFlux(await res.text());
}

/** Parse un flux Atom GameJobs.co (string) → entrées valides. Testable hors-réseau. */
export function parseFlux(xml: string): RawEntryGJC[] {
  const parsed = parser.parse(xml) as { feed?: { entry?: unknown[] } };
  const entries = parsed?.feed?.entry ?? [];
  const out: RawEntryGJC[] = [];
  for (const e of entries) {
    const r = RawEntryGJC.safeParse(e);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** Ramène une entrée Atom GameJobs.co au type métier `Offre`. */
export function normalize(raw: RawEntryGJC): Offre {
  const { studio, titre } = lireTitre(raw.title);
  // `sourceId` = segment de chemin de l'URL canonique (ex. « Lead-Game-Designer-Glow-at-CrazyLabs »).
  const sourceId = raw.id.replace(/^https?:\/\/[^/]+\//, "").replace(/[/?#].*$/, "").trim() || raw.id;

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url: raw.id,
    titre,
    studio,
    pays: null,
    ville: null,
    latitude: null,
    longitude: null,
    modeTravail: null, // déduit (board fort en remote ; non structuré dans le flux)
    contrat: null, // déduit
    experience: null, // déduit
    logiciels: [], // déduit
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; plancher `connexe` côté collecte (board curé game dev)
    langue: null, // déduit (EN)
    salaire: null,
    publieLe: parseDate(raw.updated),
    recupereLe: new Date(),
    description: null, // flux minimal : pas de description
  };
}
