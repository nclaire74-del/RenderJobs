/**
 * Connecteur **France Travail** (API Offres d'emploi v2).
 *
 * - `fetchOffres(secteur, opts)` : authentifie, interroge l'endpoint de recherche **par code
 *   ROME** (filtre métier fiable, piloté par la config de secteur) + mots-clés complémentaires,
 *   gère la pagination via l'en-tête `Content-Range`, déduplique, renvoie les offres brutes.
 * - `normalize()` : valide une offre brute (Zod) et la ramène au type métier `Offre`.
 *
 * Le connecteur est **générique** : il ne connaît pas le métier « 3D / jeu vidéo », il reçoit
 * un `Secteur` (cf. `src/domain/secteur.ts`). Les champs **déduits** (experience, logiciels,
 * specialites) ne sont PAS remplis ici : c'est le rôle de l'enrichissement dans le pipeline.
 *
 * Endpoint recherche : GET https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search
 * Statuts : 200 (résultats complets), 206 (résultats partiels), 204 (aucun résultat).
 */
import { z } from "zod";
import type { Contrat, Offre } from "@/domain/offre";
import type { Secteur } from "@/domain/secteur";
import { getAccessToken } from "./auth";

export const SOURCE = "france-travail";

const SEARCH_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

/** Taille max d'une page (contrainte API). */
const PAGE_SIZE = 150;
/**
 * Plafond dur de l'API : `range` borné à `début ≤ 1000` et `fin ≤ 1149`, soit **1150 offres
 * max par jeu de critères**. Au-delà, il faut fenêtrer par dates — on le signale plutôt que
 * de tronquer en silence.
 */
const RANGE_FIN_MAX = 1149;
const PLAFOND_RESULTATS = RANGE_FIN_MAX + 1; // 1150

/**
 * Schéma d'une offre brute France Travail.
 * `passthrough` : on tolère les champs non listés (l'API en renvoie beaucoup).
 * Seuls `id` et `intitule` sont réellement requis ; le reste est optionnel/défensif.
 */
export const RawOffreFT = z
  .object({
    id: z.string(),
    intitule: z.string(),
    description: z.string().optional(),
    dateCreation: z.string().optional(),
    dateActualisation: z.string().optional(),
    lieuTravail: z
      .object({
        libelle: z.string().optional(),
        latitude: z.coerce.number().optional(),
        longitude: z.coerce.number().optional(),
        codePostal: z.string().optional(),
        commune: z.string().optional(),
      })
      .partial()
      .optional(),
    entreprise: z.object({ nom: z.string().optional() }).partial().optional(),
    typeContrat: z.string().optional(),
    natureContrat: z.string().optional(),
    salaire: z.object({ libelle: z.string().optional() }).partial().optional(),
    origineOffre: z
      .object({ urlOrigine: z.string().optional() })
      .partial()
      .optional(),
  })
  .passthrough();

export type RawOffreFT = z.infer<typeof RawOffreFT>;

const SearchResponse = z
  .object({ resultats: z.array(z.unknown()).optional() })
  .passthrough();

export interface FetchOptions {
  /**
   * Fenêtre de fraîcheur, en jours. Valeurs acceptées par l'API : 1, 3, 7, 14, 31.
   * Borne aussi le volume par requête (aide à rester sous le plafond). Défaut : 31.
   */
  publieeDepuis?: number;
}

/** Total réel d'une recherche, lu dans l'en-tête `Content-Range: offres 0-49/208`. */
export function parseContentRangeTotal(header: string | null): number | null {
  if (!header) return null;
  const m = header.match(/\/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

/** Une requête de recherche = un critère discriminant + des paramètres communs. */
interface Requete {
  label: string;
  params: Record<string, string>;
}

/** Construit la liste des requêtes à lancer pour un secteur (1 par ROME + 1 par mot-clé). */
function requetesPourSecteur(secteur: Secteur): Requete[] {
  const requetes: Requete[] = secteur.codesRome.map((code) => ({
    label: `ROME ${code}`,
    params: { codeROME: code },
  }));
  for (const motCle of secteur.motsCles ?? []) {
    requetes.push({ label: `motsCles « ${motCle} »`, params: { motsCles: motCle } });
  }
  return requetes;
}

/**
 * Pagine une requête unique jusqu'à épuisement ou plafond API.
 * Écrit les offres dans `parId` (dédup transverse aux requêtes).
 */
async function paginerRequete(
  requete: Requete,
  partages: Record<string, string>,
  token: string,
  parId: Map<string, RawOffreFT>,
): Promise<void> {
  let offset = 0;
  let total: number | null = null;

  while (true) {
    const fin = Math.min(offset + PAGE_SIZE - 1, RANGE_FIN_MAX);
    const url = new URL(SEARCH_URL);
    for (const [k, v] of Object.entries({ ...partages, ...requete.params })) {
      url.searchParams.set(k, v);
    }
    url.searchParams.set("range", `${offset}-${fin}`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 204 = aucun résultat pour ces critères.
    if (res.status === 204) return;
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Recherche France Travail a échoué (${res.status}) pour ${requete.label} : ${detail.slice(0, 200)}`,
      );
    }

    if (total === null) total = parseContentRangeTotal(res.headers.get("content-range"));

    const data = SearchResponse.parse(await res.json());
    const resultats = data.resultats ?? [];
    for (const brut of resultats) {
      const parsed = RawOffreFT.safeParse(brut);
      if (parsed.success) parId.set(parsed.data.id, parsed.data);
    }

    const demandes = fin - offset + 1;
    // Page incomplète → plus rien à paginer.
    if (resultats.length < demandes) return;

    offset = fin + 1;

    // Plafond API atteint : on signale si des offres restent inaccessibles (pas de troncature muette).
    if (offset >= PLAFOND_RESULTATS) {
      if (total !== null && total > PLAFOND_RESULTATS) {
        console.warn(
          `[france-travail] ${requete.label} : ${total} offres mais plafond API à ${PLAFOND_RESULTATS} — ${total - PLAFOND_RESULTATS} non récupérées (fenêtrer par dates pour couvrir).`,
        );
      }
      return;
    }
  }
}

/**
 * Récupère les offres brutes d'un secteur. Déduplique par `id` (une même offre peut
 * remonter sur plusieurs codes ROME / mots-clés).
 */
export async function fetchOffres(
  secteur: Secteur,
  opts: FetchOptions = {},
): Promise<RawOffreFT[]> {
  const token = await getAccessToken();
  const partages: Record<string, string> = {
    publieeDepuis: String(opts.publieeDepuis ?? 31),
  };

  const parId = new Map<string, RawOffreFT>();
  for (const requete of requetesPourSecteur(secteur)) {
    await paginerRequete(requete, partages, token, parId);
  }
  return [...parId.values()];
}

/** Mappe le code contrat France Travail vers notre enum métier (best-effort). */
function mapContrat(raw: RawOffreFT): Contrat | null {
  const code = raw.typeContrat?.toUpperCase();
  const nature = (raw.natureContrat ?? "").toLowerCase();
  if (nature.includes("apprentissage") || nature.includes("professionnalisation"))
    return "alternance";
  switch (code) {
    case "CDI":
      return "CDI";
    case "CDD":
      return "CDD";
    case "MIS": // mission intérim → assimilé freelance/mission
      return "freelance";
    case "STG":
    case "FRA": // formation/stage
      return "stage";
    default:
      return null;
  }
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ramène une offre brute France Travail au type métier `Offre`. */
export function normalize(raw: RawOffreFT): Offre {
  const url =
    raw.origineOffre?.urlOrigine ??
    `https://candidat.francetravail.fr/offres/recherche/detail/${raw.id}`;

  return {
    id: `${SOURCE}:${raw.id}`,
    source: SOURCE,
    sourceId: raw.id,
    url,
    titre: raw.intitule,
    studio: raw.entreprise?.nom ?? null,
    pays: "France",
    // `libelle` est lisible (« 76 - ROUEN ») ; `commune` n'est que le code INSEE.
    ville: raw.lieuTravail?.libelle ?? raw.lieuTravail?.commune ?? null,
    latitude: raw.lieuTravail?.latitude ?? null,
    longitude: raw.lieuTravail?.longitude ?? null,
    modeTravail: null, // déduit plus tard (enrichissement)
    contrat: mapContrat(raw),
    experience: null, // déduit plus tard
    logiciels: [], // déduit plus tard (enrichissement)
    specialites: [], // déduit plus tard (enrichissement)
    pertinence: "connexe", // défaut conservateur ; recalculé par le pipeline (classer)
    langue: null, // déduit plus tard (enrichissement)
    salaire: raw.salaire?.libelle ?? null,
    publieLe: parseDate(raw.dateCreation),
    recupereLe: new Date(),
    description: raw.description ?? null,
  };
}
