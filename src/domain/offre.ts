/**
 * Le modèle métier central : l'**Offre normalisée**.
 *
 * Chaque source (France Travail, RSS, communauté…) a un format différent.
 * Tout connecteur doit ramener ses données brutes à ce type commun via `normalize()`.
 * Cf. `plan-hub-emploi-3d.md` §7 et `CLAUDE.md` §4.
 */

/** Modalité de présence. */
export type ModeTravail = "remote" | "hybride" | "onsite";

/** Type de contrat. */
export type Contrat = "CDI" | "CDD" | "stage" | "freelance" | "alternance";

/** Niveau d'expérience (déduit par enrichissement). */
export type Experience = "junior" | "confirme" | "senior" | "lead";

/**
 * Classe de pertinence vis-à-vis du secteur actif (déduite par le pipeline).
 * Cf. `PRODUIT.md` R-1 et ADR-0009. Principe : on ne perd JAMAIS une vraie offre.
 * - `coeur`      : clairement du secteur → flux principal.
 * - `connexe`    : pas manifestement hors-sujet (le **doute** va ici) → onglet « connexes ».
 * - `hors_scope` : bruit indiscutable uniquement (BTP, impression 3D, CAO industrielle…) → rejeté.
 */
export type Pertinence = "coeur" | "connexe" | "hors_scope";

export const MODES_TRAVAIL: readonly ModeTravail[] = [
  "remote",
  "hybride",
  "onsite",
] as const;

export const CONTRATS: readonly Contrat[] = [
  "CDI",
  "CDD",
  "stage",
  "freelance",
  "alternance",
] as const;

export const EXPERIENCES: readonly Experience[] = [
  "junior",
  "confirme",
  "senior",
  "lead",
] as const;

export const PERTINENCES: readonly Pertinence[] = [
  "coeur",
  "connexe",
  "hors_scope",
] as const;

/**
 * Une offre d'emploi normalisée, prête à être stockée et affichée.
 *
 * Clé d'unicité métier : `source` + `sourceId` (cf. schéma DB).
 */
export interface Offre {
  /** Identifiant interne stable : `${source}:${sourceId}`. */
  id: string;
  /** Connecteur d'origine : "france-travail", "rss-afjv", "communaute"… */
  source: string;
  /** Identifiant de l'offre chez la source (sert à la déduplication). */
  sourceId: string;
  /** Lien direct pour postuler sur la source officielle (attribution). */
  url: string;

  titre: string;
  /** Entreprise / studio. */
  studio: string | null;

  pays: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;

  modeTravail: ModeTravail | null;
  contrat: Contrat | null;
  /** Déduit par enrichissement. */
  experience: Experience | null;

  /** Logiciels déduits : ["Blender", "Unreal", …]. */
  logiciels: string[];
  /** Spécialités déduites : ["character", "vfx", …]. */
  specialites: string[];

  /**
   * Pertinence déduite par le pipeline (classification). Gouverne l'affichage
   * (flux principal / onglet connexes / rejet), jamais la collecte. Cf. `PRODUIT.md` R-1.
   */
  pertinence: Pertinence;

  /** Code langue ISO 639-1 détecté de l'annonce ("fr", "en"…), null si indéterminé. */
  langue: string | null;

  /** Texte libre si disponible (ex. "35-45k€", "selon profil"). */
  salaire: string | null;

  /** Date de publication chez la source. */
  publieLe: Date | null;
  /** Date de récupération par notre collecteur. */
  recupereLe: Date;

  /** Description brute de l'annonce. */
  description: string | null;

  /**
   * **Signaux structurés bruts** fournis par la source (sa taxonomie d'origine), transportés
   * jusqu'au classifieur de pertinence (`classer.ts`). Champ **transient** : rempli par chaque
   * `normalize()`, consommé par le pipeline, **non persisté** en base (le tri tourne avant l'upsert).
   *
   * Le tri doit s'appuyer sur ces signaux *avant* de retomber sur le texte (cf. `RD-TRI.md`).
   * Clés conventionnelles : `rome` + `appellation` + `domaineFormation` (France Travail) ;
   * `categorieAdzuna` (tag de catégorie Adzuna) ; `familleMetier` (3ᵉ catégorie AFJV) ;
   * `departement` / `equipe` (ATS, à venir). Absent = aucun signal structuré pour cette source.
   */
  signaux?: Record<string, string>;
}
