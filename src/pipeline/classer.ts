/**
 * Classification de **pertinence** d'une offre vis-à-vis du secteur (cf. `PRODUIT.md` R-1).
 *
 * Principe directeur **non négociable** : on ne perd JAMAIS une vraie offre. Le tri organise
 * l'affichage, il n'élague pas. `hors_scope` (rejet) est une **exception rare** réservée au
 * bruit indiscutable ; **au moindre doute → `connexe`** (montré dans un 2ᵉ flux).
 *
 * Ordre d'évaluation (les signaux **cœur priment sur le bruit**, pour ne jamais rejeter à tort) :
 *   1. logiciel 3D/VFX/jeu détecté → `coeur` ;
 *   2. vocabulaire métier net → `coeur` ;
 *   3. sinon, bruit industriel/BTP/hors-secteur indiscutable → `hors_scope` ;
 *   4. sinon → `connexe` (la grande zone grise : graphiste, infographiste, motion…).
 *
 * Conçu d'après la R&D sur les 214 offres FT : le meilleur discriminant est la présence (ou non)
 * d'un **logiciel cœur** dans la description ; le titre seul est trompeur (« Designer graphique »).
 */
import type { Offre, Pertinence } from "@/domain/offre";
import { LOGICIELS_COEUR, replier } from "./enrichir";

/**
 * Vocabulaire **art/jeu exclusif** → cœur. Bilingue FR/EN, replié (sans accents).
 * Volontairement SANS les termes 3D génériques (« modélisation 3D », « rendu 3D ») que la
 * mécanique/BTP partagent : ils enverraient à tort un projeteur industriel en cœur.
 */
const VOCABULAIRE_COEUR = compiler([
  "jeu video", "jeux video", "jeu-video", "game designer", "game design", "game artist",
  "game developer", "game programmer", "game dev", "gameplay",
  "level design", "level designer", "level artist", "narrative design", "narrative designer",
  "vfx", "effets visuels", "visual effects", "compositing", "rotoscopie",
  "film d'animation", "long metrage d'animation", "studio d'animation",
  "rigging", "character artist", "environment artist", "matte painting", "previz",
  "motion capture", "mocap", "look dev", "lookdev", "concept art", "texturing",
]);

/**
 * Bruit **indiscutable** → hors_scope (uniquement si AUCUN signal cœur). Barre haute (R-1) :
 * BTP, mécanique/usinage, CAO industrielle, impression 3D, électronique, dev web pur,
 * escape game (≠ jeu vidéo), métiers sans rapport avec un artiste.
 */
const BRUIT_DUR = compiler([
  // BTP / manuel
  "macon", "cariste", "chauffeur", "chantier", "couvreur", "plombier",
  "electricien", "menuisier", "carrossier", "carrosserie", "facade",
  // mécanique / industrie (y compris CAO indus citée en titre : 3DX, SolidWorks, CATIA…)
  "chaudronnier", "chaudronnerie", "usinage", "fraisage", "tournage numerique",
  "materiaux composites", "soudeur", "soudure", "ajusteur", "tuyauteur",
  "mecanique 3d", "conception mecanique", "bureau d'etudes mecanique",
  "3dx", "3dexperience", "solidworks", "catia", "creo",
  // impression 3D / prototypage matériel
  "impression 3d", "imprimante 3d", "prototypage rapide", "fabrication additive",
  // électronique / SI pur
  "fpga", "carte electronique", "developpeur php", "laravel", "symfony",
  "developpeur back", "administrateur systeme", "data engineer", "mdm",
  // dessin technique BTP / industriel
  "dessinateur industriel", "dessinateur btp", "dessinateur batiment",
  "dessinateur en agencement", "dessinateur projeteur", "projeteur",
  // loisirs / escape game (game master physique ≠ jeu vidéo)
  "escape game", "game master", "laser game",
]);

function compiler(motifs: string[]): RegExp {
  const alt = motifs
    .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`(?<![a-z0-9])(?:${alt})(?![a-z0-9])`, "i");
}

/**
 * Détermine la pertinence d'une offre **déjà enrichie** (ses `logiciels` sont remplis).
 * Pur et déterministe.
 */
export function classer(offre: Offre): Pertinence {
  // 1. Un logiciel 3D/VFX/jeu est le signal cœur le plus fiable — et il prime sur tout bruit.
  if (offre.logiciels.some((l) => LOGICIELS_COEUR.has(l))) return "coeur";

  // Vocabulaire métier : cherché dans titre + description (la description révèle le métier réel).
  const texte = replier(`${offre.titre}\n${offre.description ?? ""}`);
  if (VOCABULAIRE_COEUR.test(texte)) return "coeur";

  // 3. Bruit indiscutable → rejet (exception rare, R-1). Le signal fiable est le **titre** (le
  //    rôle), JAMAIS le boilerplate d'une longue description : une entreprise du BTP qui recrute
  //    un graphiste reste un poste de graphiste (→ connexe). On ne rejette que sur le métier affiché.
  if (BRUIT_DUR.test(replier(offre.titre))) return "hors_scope";

  // 4. Tout le reste : on montre (zone grise). Le doute profite à l'offre.
  return "connexe";
}
