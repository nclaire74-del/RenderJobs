/**
 * Le **secteur actif** de la plateforme.
 *
 * C'est LE point de configuration qui ouvre/ferme le périmètre. Le reste du code
 * (connecteurs, pipeline) est générique et ne fait que consommer cet objet. Changer de
 * secteur = éditer ce fichier, sans toucher au moteur.
 *
 * Codes ROME choisis **empiriquement** : on a sondé l'API Offres d'emploi sur nos mots-clés
 * et relevé les `romeCode` qui portent réellement les offres du secteur (vs le bruit type
 * « vendeur d'articles de sport »). Référentiel ROME 4.0.
 */
import type { Secteur } from "@/domain/secteur";

export const SECTEUR_ACTIF: Secteur = {
  id: "3d-jeu-video",
  libelle: "3D / Jeu vidéo / VFX / Animation",
  codesRome: [
    "M1831", // Développeur / Développeuse - jeux vidéo
    "E1125", // Concepteur / Conceptrice de jeux vidéo (game/level design)
    "E1115", // Chef / Cheffe de projet jeux vidéo
    "E1111", // Game master
    "L1510", // Animateur / Animatrice 3D - films d'animation
    "E1205", // Designer graphique (large : infographistes 3D, 3D artists)
    "M1837", // Développeur / Développeuse multimédia
  ],
  // Filet complémentaire pour ce que le ROME découpe mal (ex. studios qui publient
  // sous un intitulé atypique). Volontairement court — le ROME fait le gros du tri.
  motsCles: ["VFX", "Unreal Engine", "Houdini"],
  // Phrases métier discriminantes (FR/EN) pour les sources par mots-clés (Adzuna…).
  // On évite les termes nus (« 3D », « game ») qui ramènent du bruit ; le pipeline trie le reste.
  requetesTexte: [
    "game developer",
    "game designer",
    "game programmer",
    "level designer",
    "technical artist",
    "3D artist",
    "character artist",
    "environment artist",
    "VFX artist",
    "3D animator",
    "Unreal Engine",
    "Unity developer",
    "développeur jeux vidéo",
    "infographiste 3D",
    "animateur 3D",
    "directeur artistique jeu vidéo",
  ],
};
