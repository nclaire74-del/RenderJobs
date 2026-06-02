/**
 * Connecteur **RemoteGameJobs** (remotegamejobs.com) — board **jeu vidéo 100 % remote**.
 *
 * Source 🟠 Tier 3 (cf. `SOURCES.md`) : **pas d'API ni de RSS**, mais la page d'accueil rend les
 * offres **directement dans le HTML** (app Rails server-rendered, classes Bulma) → un simple
 * `fetch` + **cheerio** suffit (pas de Playwright). Board **curé jeu vidéo** → plancher `connexe`
 * appliqué côté pipeline (comme AFJV / Games-Career).
 *
 * Ce que la liste fournit par offre (vérifié 2026-06) :
 * - `a[title]` « <Studio> is hiring <Rôle> (Remote Job) » + `href` = URL de l'offre (→ `sourceId`).
 * - `strong.f-20` = **titre** du rôle (le juge du cœur, cf. `classer.ts`).
 * - `small.f-15` = **studio**.
 * - span `fa-file-signature` = **type de contrat** (Full Time / Contract / Internship…).
 * - span `fa-map-pin` = **lieu** (texte libre, souvent « Remote, … »).
 * - `span.tag.is-warning` = **tags compétences/techno** (C++, Unity, Maya, 3D Art…) — multiples et
 *   hétérogènes (pas une famille métier propre) → on les **concatène dans la description** pour
 *   nourrir l'enrichissement (détection logiciels), PAS comme signal `familleMetier`.
 *
 * Le `modeTravail` est **toujours `remote`** (c'est la raison d'être du board).
 * La description courte de la liste suffit au tri (titre) + à l'enrichissement (tags = logiciels) ;
 * un fetch optionnel de la page de détail (description complète) pourra l'enrichir plus tard.
 */
import { load } from "cheerio";
import type { Offre, Contrat } from "@/domain/offre";

export const SOURCE = "remote-game-jobs";

const LISTING_URL = "https://remotegamejobs.com/";
const USER_AGENT = "HubEmploi3D/0.1 (+job aggregator)";

/** Offre brute extraite de la liste HTML RemoteGameJobs. */
export interface RawJobRGJ {
  url: string;
  titre: string;
  studio: string | null;
  lieu: string | null;
  contratBrut: string | null;
  tags: string[];
}

/** Mappe le libellé de contrat du board vers notre enum `Contrat` (null si inconnu/ambigu). */
function mapContrat(brut: string | null): Contrat | null {
  if (!brut) return null;
  const s = brut.toLowerCase();
  if (s.includes("intern")) return "stage";
  if (s.includes("freelance") || s.includes("contract")) return "freelance";
  if (s.includes("full") || s.includes("permanent")) return "CDI";
  return null;
}

/** Réduit les blancs (espaces, retours, tabulations) à un seul espace. */
function compact(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Récupère et parse la liste d'offres RemoteGameJobs. */
export async function fetchOffres(): Promise<RawJobRGJ[]> {
  const res = await fetch(LISTING_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`RemoteGameJobs inaccessible (${res.status} ${res.statusText}).`);
  }
  return parseListe(await res.text());
}

/** Parse la liste HTML RemoteGameJobs → offres brutes valides. Testable hors-réseau. */
export function parseListe(html: string): RawJobRGJ[] {
  const $ = load(html);
  const out: RawJobRGJ[] = [];

  $("div.job-box").each((_, el) => {
    const box = $(el);
    const lien = box.find("a[href]").first();
    const url = (lien.attr("href") ?? "").trim();
    if (!url || !/\/jobs\//.test(url)) return; // pas une offre exploitable

    const titre = compact(box.find("strong.f-20").first().text());
    if (!titre) return;

    const studio = compact(box.find("small.f-15").first().text()) || null;

    // Lieu : le span parent de l'icône carte. Contrat : le span parent de l'icône signature.
    const lieu =
      compact(box.find("i.fa-map-pin").closest("span").parent().text()) || null;
    const contratBrut =
      compact(box.find("i.fa-file-signature").closest("span").parent().text()) || null;

    const tags = box
      .find("span.tag.is-warning")
      .map((__, t) => compact($(t).text()))
      .get()
      .filter(Boolean);

    out.push({ url, titre, studio, lieu, contratBrut, tags });
  });

  return out;
}

/** Ramène une offre brute RemoteGameJobs au type métier `Offre`. */
export function normalize(raw: RawJobRGJ): Offre {
  // `sourceId` stable = le slug d'URL après « /jobs/ » (sinon l'URL complète en repli).
  const apresJobs = raw.url.split("/jobs/")[1];
  const sourceId = (apresJobs || raw.url).replace(/[#?].*$/, "").trim();

  // Description courte : lieu + tags compétences (→ nourrit l'enrichissement logiciels/spécialités).
  const morceaux: string[] = [];
  if (raw.lieu) morceaux.push(raw.lieu);
  if (raw.tags.length) morceaux.push(`Compétences : ${raw.tags.join(", ")}.`);
  const description = morceaux.length ? morceaux.join("\n") : null;

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    url: raw.url,
    titre: raw.titre,
    studio: raw.studio,
    pays: null, // remote / non structuré dans la liste
    ville: null,
    latitude: null,
    longitude: null,
    modeTravail: "remote", // board 100 % remote
    contrat: mapContrat(raw.contratBrut),
    experience: null, // déduit par l'enrichissement
    logiciels: [], // déduit (les tags arrivent via la description)
    specialites: [], // déduit
    pertinence: "connexe", // défaut ; recalculé par le pipeline (plancher `connexe` côté collecte)
    langue: null, // déduit (contenu EN)
    salaire: null,
    publieLe: null, // pas de date fiable dans la liste
    recupereLe: new Date(),
    description,
  };
}
