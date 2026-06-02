/**
 * Enrichissement d'une offre : déduit **logiciels**, **spécialités**, **niveau** et
 * **langue** à partir du texte (titre + description). Code **pur** et testé unitairement.
 *
 * Règle d'or (ADR-0009 / `PRODUIT.md` R-2) : l'enrichissement **annote, ne filtre jamais**.
 * Une offre sans étiquette déductible reste une offre valide (listes vides = état normal).
 *
 * Bilingue FR/EN : les noms de **logiciels** sont langue-neutres ; les **spécialités** et
 * **niveaux** sont doublés FR/EN. Le texte est replié (minuscules + sans accents) avant
 * comparaison, pour matcher « modélisation » comme « modelisation ».
 *
 * Les **catégories de logiciels** sont exportées (`LOGICIELS_COEUR`) car le classifieur de
 * pertinence (`classer.ts`) s'appuie dessus : un soft 3D/VFX/jeu est le meilleur discriminant
 * cœur/bruit observé en R&D (cf. HANDOFF).
 */
import type { Experience, ModeTravail, Offre } from "@/domain/offre";

/** Replie un texte pour comparaison robuste : minuscules + diacritiques retirés. */
export function replier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Compile une liste de motifs (déjà repliés) en une regex à frontières alphanumériques.
 * Lookbehind/lookahead plutôt que `\b` : fiable autour des chiffres et tirets (« 3ds max », « v-ray »).
 */
export function compilerMotifs(motifs: string[]): RegExp {
  const alt = motifs
    .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`(?<![a-z0-9])(?:${alt})(?![a-z0-9])`, "i");
}

/** Une entrée de lexique : un label canonique + les motifs (repliés) qui le déclenchent. */
interface Entree {
  canon: string;
  motifs: string[];
}

function detecter(entrees: Entree[], hay: string): string[] {
  const trouves: string[] = [];
  for (const e of entrees) {
    if (compilerMotifs(e.motifs).test(hay)) trouves.push(e.canon);
  }
  return trouves;
}

// ---------------------------------------------------------------------------
// Lexique LOGICIELS (langue-neutre), groupé par famille.
// ---------------------------------------------------------------------------

/** Logiciels 3D / VFX / jeu : signature **cœur** indiscutable du secteur. */
const LOGICIELS_3D_JEU: Entree[] = [
  { canon: "Maya", motifs: ["maya"] },
  { canon: "Blender", motifs: ["blender"] },
  { canon: "3ds Max", motifs: ["3ds max", "3dsmax", "3ds-max"] },
  { canon: "Cinema 4D", motifs: ["cinema 4d", "c4d"] },
  { canon: "Houdini", motifs: ["houdini"] },
  { canon: "ZBrush", motifs: ["zbrush"] },
  { canon: "Modo", motifs: ["modo"] },
  { canon: "Mudbox", motifs: ["mudbox"] },
  { canon: "Substance", motifs: ["substance painter", "substance designer", "substance 3d", "substance"] },
  { canon: "Mari", motifs: ["mari"] },
  { canon: "Quixel", motifs: ["quixel", "megascans"] },
  { canon: "Nuke", motifs: ["nuke"] },
  { canon: "Fusion", motifs: ["blackmagic fusion"] },
  { canon: "Mocha", motifs: ["mocha"] },
  { canon: "Arnold", motifs: ["arnold"] },
  { canon: "V-Ray", motifs: ["v-ray", "vray"] },
  { canon: "Redshift", motifs: ["redshift"] },
  { canon: "Octane", motifs: ["octane"] },
  { canon: "RenderMan", motifs: ["renderman"] },
  { canon: "Unreal Engine", motifs: ["unreal engine", "unreal", "ue4", "ue5"] },
  { canon: "Unity", motifs: ["unity 3d", "unity3d", "unity"] },
  { canon: "Godot", motifs: ["godot"] },
  { canon: "CryEngine", motifs: ["cryengine"] },
  { canon: "Marvelous Designer", motifs: ["marvelous designer", "marvelous"] },
  { canon: "Toon Boom Harmony", motifs: ["toon boom", "toonboom", "harmony"] },
  { canon: "TVPaint", motifs: ["tvpaint", "tv paint"] },
  { canon: "Storyboard Pro", motifs: ["storyboard pro"] },
  { canon: "SpeedTree", motifs: ["speedtree"] },
];

/** Logiciels vidéo/motion : présents dans le secteur **et** ailleurs → signal **connexe** (pas cœur seul). */
const LOGICIELS_MOTION: Entree[] = [
  { canon: "After Effects", motifs: ["after effects", "after-effects", "aftereffects"] },
  { canon: "Premiere Pro", motifs: ["premiere pro", "premiere"] },
  { canon: "DaVinci Resolve", motifs: ["davinci resolve", "davinci"] },
];

/** Suite graphique/print Adobe : signature **graphiste/PAO** → typiquement connexe. */
const LOGICIELS_PRINT: Entree[] = [
  { canon: "Photoshop", motifs: ["photoshop"] },
  { canon: "Illustrator", motifs: ["illustrator"] },
  { canon: "InDesign", motifs: ["indesign"] },
  { canon: "Acrobat", motifs: ["acrobat"] },
  { canon: "Figma", motifs: ["figma"] },
];

/** CAO **industrielle/mécanique** : signal **hors-secteur** fort (mécanique, usine). */
const LOGICIELS_CAO_INDUS: Entree[] = [
  { canon: "SolidWorks", motifs: ["solidworks", "solid works"] },
  { canon: "CATIA", motifs: ["catia"] },
  { canon: "Inventor", motifs: ["autodesk inventor"] },
  { canon: "Creo", motifs: ["creo"] },
  { canon: "3DEXPERIENCE", motifs: ["3dexperience", "3dx"] },
];

/** CAO **architecture/AEC** : archviz → adjacente au secteur, donc **neutre** (jamais rejet). */
const LOGICIELS_AEC: Entree[] = [
  { canon: "AutoCAD", motifs: ["autocad"] },
  { canon: "Revit", motifs: ["revit"] },
];

const TOUS_LOGICIELS = [
  ...LOGICIELS_3D_JEU,
  ...LOGICIELS_MOTION,
  ...LOGICIELS_PRINT,
  ...LOGICIELS_CAO_INDUS,
  ...LOGICIELS_AEC,
];

/** Ensemble des labels « cœur » : utilisé par le classifieur de pertinence. */
export const LOGICIELS_COEUR: ReadonlySet<string> = new Set(
  LOGICIELS_3D_JEU.map((e) => e.canon),
);
/**
 * Motifs (repliés) des logiciels **cœur**, à plat. Le classifieur s'en sert pour tester la
 * présence d'un soft cœur **dans le titre seul** (signal fort) vs la description (corroboration).
 */
export const LOGICIELS_COEUR_MOTIFS: readonly string[] = LOGICIELS_3D_JEU.flatMap(
  (e) => e.motifs,
);
/** Labels CAO industrielle : signal hors-scope pour le classifieur (mécanique, pas archi). */
export const LOGICIELS_CAO_INDUS_LABELS: ReadonlySet<string> = new Set(
  LOGICIELS_CAO_INDUS.map((e) => e.canon),
);

// ---------------------------------------------------------------------------
// Lexique SPÉCIALITÉS (bilingue FR/EN).
// ---------------------------------------------------------------------------

const SPECIALITES: Entree[] = [
  { canon: "character", motifs: ["character", "personnage", "perso 3d"] },
  { canon: "environment", motifs: ["environment", "environnement 3d", "decor", "set dressing"] },
  { canon: "rigging", motifs: ["rigging", "rig", "skinning", "setup perso"] },
  { canon: "modeling", motifs: ["modeling", "modelisation", "modeleur", "modeling 3d"] },
  { canon: "texturing", motifs: ["texturing", "texture", "look dev", "lookdev", "shading", "surfacing"] },
  { canon: "lighting", motifs: ["lighting", "eclairage", "lighter"] },
  { canon: "compositing", motifs: ["compositing", "compositeur", "compositor"] },
  { canon: "vfx", motifs: ["vfx", "effets visuels", "visual effects", "fx", "effets speciaux"] },
  { canon: "animation", motifs: ["animation", "animateur", "animator", "animation 3d"] },
  { canon: "motion-design", motifs: ["motion design", "motion designer", "motion graphics", "motion graphic"] },
  { canon: "concept-art", motifs: ["concept art", "concept artist", "concept designer"] },
  {
    canon: "game-design",
    motifs: ["game design", "game designer", "level design", "level designer", "gameplay", "systems designer", "combat designer"],
  },
  { canon: "storyboard", motifs: ["storyboard", "story-board", "story board"] },
  { canon: "matte-painting", motifs: ["matte painting", "matte painter"] },
  { canon: "previz", motifs: ["previz", "pre-visualisation", "previsualisation"] },
  { canon: "rotoscopie", motifs: ["rotoscopie", "rotoscoping", "roto"] },
  { canon: "archviz", motifs: ["archviz", "architectural visualization", "visualisation architecturale"] },
  // --- Spécialités ajoutées (R&D 2026-06 : ~30 % des offres sortaient sans étiquette) ---
  // Annotations seulement (le classifieur n'utilise PAS `specialites`), motifs volontairement
  // précis (rôles, pas mots génériques) pour garder le filtre net.
  {
    canon: "generaliste-3d",
    motifs: ["3d artist", "artiste 3d", "3d generalist", "generaliste 3d", "cg artist", "cgi artist"],
  },
  {
    canon: "technical-art",
    motifs: ["technical artist", "tech artist", "technical art director", "technical animator", "td artist"],
  },
  {
    canon: "programmation",
    motifs: [
      "programmeur", "programmer", "gameplay programmer", "engine programmer", "graphics programmer",
      "tools programmer", "network programmer", "game programmer", "ai programmer", "rendering programmer",
      "software engineer", "ingenieur logiciel", "rendering engineer", "engine developer", "gameplay engineer",
      "developpeur gameplay", "developpeur jeu",
    ],
  },
  {
    canon: "ui-ux",
    motifs: ["ui designer", "ux designer", "ui artist", "ui/ux", "ux/ui", "user interface", "user experience", "ux researcher"],
  },
  {
    canon: "audio",
    motifs: ["sound designer", "sound design", "audio designer", "audio programmer", "audio director", "sound engineer", "ingenieur du son", "concepteur sonore", "music composer", "game composer"],
  },
  {
    canon: "qa",
    motifs: ["qa", "quality assurance", "assurance qualite", "testeur", "test engineer", "qa engineer", "qa analyst"],
  },
  {
    canon: "narration",
    motifs: ["narrative designer", "narrative design", "narrative director", "scenariste", "game writer", "lead writer", "ecriture de scenario"],
  },
  {
    canon: "production",
    motifs: ["producer", "producteur", "productrice", "production manager", "line producer", "associate producer", "executive producer", "chef de projet"],
  },
  {
    canon: "graphisme",
    motifs: ["graphiste", "infographiste", "graphic designer", "designer graphique"],
  },
  {
    canon: "illustration",
    motifs: ["illustrateur", "illustratrice", "illustrator", "illustration"],
  },
];

// ---------------------------------------------------------------------------
// Lexique NIVEAU (bilingue). Priorité : lead > senior > junior.
// ---------------------------------------------------------------------------

const NIVEAU_LEAD = compilerMotifs([
  "lead", "supervisor", "superviseur", "head of", "directeur artistique",
  "directrice artistique", "art director", "principal",
]);
const NIVEAU_SENIOR = compilerMotifs([
  "senior", "confirme", "experimente", "expert", "principal artist",
]);
const NIVEAU_JUNIOR = compilerMotifs([
  "junior", "debutant", "debutante", "jeune diplome", "sortie d'ecole",
  "graduate", "entry level", "entry-level", "stagiaire", "internship",
  "apprenti", "alternant",
]);

function detecterNiveau(hay: string): Experience | null {
  if (NIVEAU_LEAD.test(hay)) return "lead";
  if (NIVEAU_SENIOR.test(hay)) return "senior";
  if (NIVEAU_JUNIOR.test(hay)) return "junior";
  return null;
}

// ---------------------------------------------------------------------------
// MODE DE TRAVAIL (bilingue). Prudent : ne déduit que sur signal explicite.
// ---------------------------------------------------------------------------

const REMOTE_TOTAL = compilerMotifs([
  "100% teletravail", "full remote", "teletravail total", "fully remote",
  "remote first", "100% remote", "integralement a distance",
]);
const HYBRIDE = compilerMotifs([
  "hybride", "hybrid", "teletravail partiel", "remote partiel", "jours de teletravail",
]);
const REMOTE_GENERIQUE = compilerMotifs(["teletravail", "remote", "a distance", "distanciel"]);

function detecterMode(hay: string): ModeTravail | null {
  if (REMOTE_TOTAL.test(hay)) return "remote";
  if (HYBRIDE.test(hay)) return "hybride";
  if (REMOTE_GENERIQUE.test(hay)) return "hybride"; // mention vague → hybride (hypothèse prudente)
  return null;
}

// ---------------------------------------------------------------------------
// LANGUE : heuristique simple FR vs EN.
// ---------------------------------------------------------------------------

const MOTS_FR = ["et", "le", "les", "des", "vous", "nous", "pour", "avec"];
const MOTS_EN = ["the", "and", "you", "we", "for", "with", "our", "your"];

function compterMarqueurs(mots: string[], hay: string): number {
  return mots.reduce((n, m) => (compilerMotifs([m]).test(hay) ? n + 1 : n), 0);
}

function detecterLangue(hay: string): string | null {
  const fr = compterMarqueurs(MOTS_FR, hay);
  const en = compterMarqueurs(MOTS_EN, hay);
  if (fr === 0 && en === 0) return null;
  return en > fr ? "en" : "fr";
}

/**
 * Enrichit une offre : renvoie une **copie** annotée (logiciels, spécialités, niveau si
 * absent, mode de travail si absent, langue). N'écrase pas un `experience`/`modeTravail`
 * déjà fourni par la source. Ne filtre jamais.
 */
export function enrichir(offre: Offre): Offre {
  const hay = replier(`${offre.titre}\n${offre.description ?? ""}`);

  return {
    ...offre,
    logiciels: detecter(TOUS_LOGICIELS, hay),
    specialites: detecter(SPECIALITES, hay),
    experience: offre.experience ?? detecterNiveau(hay),
    modeTravail: offre.modeTravail ?? detecterMode(hay),
    langue: offre.langue ?? detecterLangue(hay),
  };
}
