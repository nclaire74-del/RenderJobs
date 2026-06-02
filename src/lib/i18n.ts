/**
 * Textes de l'interface — externalisés pour être **i18n-ready** (ADR-0009 / R-4).
 *
 * Au lancement : une seule locale, le **français**. La structure (un dictionnaire
 * par langue + des helpers de libellé) permet d'ajouter `en` plus tard sans
 * toucher aux composants : ceux-ci importent `t` et les `libelle*()`, jamais des
 * chaînes en dur.
 */
import type { Contrat, Experience, ModeTravail } from "@/domain/offre";

export const LOCALE_ACTIVE = "fr" as const;

/** Libellés statiques de l'UI. */
export const t = {
  titreApp: "Hub Emploi 3D & Jeu Vidéo",
  sousTitre:
    "Toutes les offres 3D, jeu vidéo, animation et VFX — au même endroit. Sans compte.",

  vue: {
    coeur: "Cœur de métier",
    connexe: "Offres connexes",
  } satisfies Record<string, string>,
  vueAide: {
    coeur: "Offres clairement dans le secteur.",
    connexe: "Métiers proches ou à vérifier — le doute profite à l'offre.",
  } satisfies Record<string, string>,

  filtres: {
    titre: "Filtrer",
    pays: "Lieu",
    tousPays: "Tous les lieux",
    sansPays: "Lieu non précisé",
    contrat: "Contrat",
    tousContrats: "Tous contrats",
    experience: "Niveau",
    tousNiveaux: "Tous niveaux",
    logiciel: "Logiciel",
    tousLogiciels: "Tous logiciels",
    specialite: "Spécialité",
    toutesSpecialites: "Toutes spécialités",
    mode: "Mode de travail",
    tousModes: "Tous modes",
    recherche: "Rechercher (poste, studio…)",
    valider: "Appliquer",
    reinitialiser: "Réinitialiser",
    raccourcisJunior: "Pour les juniors :",
  },

  offre: {
    voir: "Voir l'offre",
    via: "via",
    publieeLe: "Publiée le",
    recupereeLe: "Repérée le",
    paysInconnu: "Lieu non précisé",
    aucuneEtiquette: "Pas d'étiquette détaillée",
  },

  liste: {
    aucune: "Aucune offre ne correspond à ces filtres.",
    aucuneAide: "Essayez l'onglet « Offres connexes » ou élargissez les filtres.",
    pagePrecedente: "← Précédentes",
    pageSuivante: "Suivantes →",
    page: "Page",
  },

  pied: "Chaque offre renvoie vers sa source officielle. Aucune donnée personnelle collectée.",

  erreur: {
    titre: "Une erreur est survenue",
    aide: "Le chargement des offres a échoué. Réessaie dans un instant.",
    reessayer: "Réessayer",
  },

  tri: {
    libelle: "Trier :",
    fraicheur: "Plus récentes",
    pourMoi: "Pour moi",
  },

  profil: {
    titre: "Mon profil",
    aide: "Décris ton profil pour voir ta correspondance sur chaque offre et trier « pour moi ». Stocké sur cet appareil, sans compte.",
    ouvrir: "Mon profil",
    logiciels: "Logiciels maîtrisés",
    specialites: "Spécialités visées",
    experience: "Niveau",
    pays: "Lieu souhaité",
    mode: "Mode de travail",
    enregistrer: "Enregistrer",
    effacer: "Effacer",
    indefini: "—",
    correspondance: "correspondance",
  },
} as const;

/** Libellés des contrats. */
const CONTRATS_FR: Record<Contrat, string> = {
  CDI: "CDI",
  CDD: "CDD",
  stage: "Stage",
  freelance: "Freelance",
  alternance: "Alternance",
};
export const libelleContrat = (c: Contrat): string => CONTRATS_FR[c];

/** Libellés des niveaux d'expérience. */
const EXPERIENCES_FR: Record<Experience, string> = {
  junior: "Junior / débutant",
  confirme: "Confirmé",
  senior: "Senior",
  lead: "Lead / direction",
};
export const libelleExperience = (e: Experience): string => EXPERIENCES_FR[e];

/**
 * Libellés FR des **spécialités** (codes canon déduits par `enrichir.ts`).
 * Un code inconnu retombe sur lui-même (jamais d'écran vide).
 */
const SPECIALITES_FR: Record<string, string> = {
  character: "Personnage",
  environment: "Environnement",
  rigging: "Rigging",
  modeling: "Modélisation",
  texturing: "Texturing / look dev",
  lighting: "Éclairage",
  compositing: "Compositing",
  vfx: "VFX / effets visuels",
  animation: "Animation",
  "motion-design": "Motion design",
  "concept-art": "Concept art",
  "game-design": "Game design",
  storyboard: "Storyboard",
  "matte-painting": "Matte painting",
  previz: "Prévisualisation",
  rotoscopie: "Rotoscopie",
  archviz: "Archviz",
  "generaliste-3d": "Généraliste 3D",
  "technical-art": "Technical art",
  programmation: "Programmation",
  "ui-ux": "UI / UX",
  audio: "Audio / son",
  qa: "QA / test",
  narration: "Narration / écriture",
  production: "Production",
  graphisme: "Graphisme",
  illustration: "Illustration",
};
export const libelleSpecialite = (s: string): string => SPECIALITES_FR[s] ?? s;

/** Libellés du mode de travail. */
const MODES_FR: Record<ModeTravail, string> = {
  remote: "À distance",
  hybride: "Hybride",
  onsite: "Sur site",
};
export const libelleMode = (m: ModeTravail): string => MODES_FR[m];

/** Nom lisible d'une source (attribution). */
const SOURCES_FR: Record<string, string> = {
  "france-travail": "France Travail",
  afjv: "AFJV",
  adzuna: "Adzuna",
  "games-career": "Games-Career",
  communaute: "Communauté",
};
export const libelleSource = (s: string): string => SOURCES_FR[s] ?? s;

/** Niveaux mis en avant pour la cible n°1 (juniors). Cf. PRODUIT.md persona 1. */
export const RACCOURCIS_JUNIOR = [
  { contrat: "stage" as Contrat, label: "Stages" },
  { contrat: "alternance" as Contrat, label: "Alternances" },
  { experience: "junior" as Experience, label: "Postes juniors" },
];
