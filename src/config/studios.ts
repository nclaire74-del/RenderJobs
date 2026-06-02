/**
 * Liste **curée** de studios dont la page carrière est hébergée sur un **ATS à API publique**
 * (sans clé). Cf. `SOURCES.md` Tier 1bis et `RD-TRI.md` §5bis. Chaque studio = un `slug` + la
 * `plateforme` ATS qui répond. La couverture = cette liste (silence = studio absent, pas « rien
 * ne recrute ») → on l'agrandit studio par studio.
 *
 * **Mappings vérifiés en réel (2026-06)** par sondage des trois endpoints. Les slugs se
 * découvrent un par un (devinettes souvent en 404 ; beaucoup d'AAA sont sur Workday, hors périmètre ici).
 */

/** Plateformes ATS supportées par le connecteur générique (API publique, sans clé). */
export type AtsPlateforme = "greenhouse" | "lever" | "ashby";

export interface Studio {
  /** Identifiant de l'entreprise chez l'ATS (segment d'URL de l'API publique). */
  slug: string;
  /** Plateforme ATS hébergeant les offres. */
  ats: AtsPlateforme;
  /** Nom lisible du studio (affichage / fallback `studio`). */
  nom: string;
}

export const STUDIOS: Studio[] = [
  // --- Greenhouse ---
  { slug: "riotgames", ats: "greenhouse", nom: "Riot Games" },
  { slug: "roblox", ats: "greenhouse", nom: "Roblox" },
  { slug: "epicgames", ats: "greenhouse", nom: "Epic Games" },
  { slug: "scopely", ats: "greenhouse", nom: "Scopely" },
  // (Discord écarté : plateforme de communication, pas un studio — postes = SaaS générique.)
  { slug: "rockstargames", ats: "greenhouse", nom: "Rockstar Games" },
  { slug: "naughtydog", ats: "greenhouse", nom: "Naughty Dog" },
  // --- Lever ---
  { slug: "voodoo", ats: "lever", nom: "Voodoo" },
  { slug: "kabam", ats: "lever", nom: "Kabam" },
  { slug: "avalanchestudios", ats: "lever", nom: "Avalanche Studios" },
  { slug: "jamcity", ats: "lever", nom: "Jam City" },
  // --- Ashby ---
  { slug: "supercell", ats: "ashby", nom: "Supercell" },
  { slug: "thatgamecompany", ats: "ashby", nom: "thatgamecompany" },
  { slug: "seconddinner", ats: "ashby", nom: "Second Dinner" },
];
