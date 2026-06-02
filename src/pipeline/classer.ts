/**
 * Classification de **pertinence** d'une offre vis-à-vis du secteur (cf. `PRODUIT.md` R-1).
 *
 * ## Tri **en couches** — signaux structurés d'abord, texte en dernier recours (cf. `RD-TRI.md`)
 *
 * Le tri purement textuel laissait passer du bruit (« Automaticien » promu cœur par un « Unity »
 * égaré dans la description ; « Senior Software Engineer » chez *Unity Software* via le nom de la
 * boîte). La règle : **exploiter d'abord les signaux que la source donne déjà** (code ROME France
 * Travail, catégorie Adzuna, famille AFJV, département ATS), puis le **titre** (le rôle réel), et
 * seulement en dernier le corps de l'annonce.
 *
 * ## Mode **strict** (décision produit 2026-06 : resserrer le tri)
 *
 * L'ancien défaut « dans le doute → connexe » transformait l'onglet connexes en déversoir
 * (usineur, prof de maths, gestion de patrimoine…). Désormais : **aucun signal du secteur → caché**
 * (`hors_scope`). La sécurité anti-perte (R-1) est préservée autrement : les sources **ciblées par
 * taxonomie** (France Travail par code ROME) ou **curées** (AFJV/Games-Career, plancher `connexe`
 * appliqué dans `collect.ts`) ne tombent **jamais** sous `connexe`. Seul le **filet large** (Adzuna,
 * recherche par phrases) peut être rejeté — c'est précisément la source bruitée.
 *
 * Ordre d'évaluation (un `return` = décision finale) :
 *   1. titre disqualifiant (industrie/finance/enseignement/admin) → `hors_scope` (prime sur tout) ;
 *   2. catégorie Adzuna franchement hors-secteur → `hors_scope` (sauf signal cœur fort dans le titre) ;
 *   3. signal structuré cœur **fiable** (département ATS « craft », famille AFJV craft) → `coeur` ;
 *   4. logiciel/rôle cœur **dans le titre** → `coeur` (seul juge du cœur pour France Travail) ;
 *   5. plancher de secteur (offre collectée via une taxonomie du secteur : ROME FT, famille AFJV) → `connexe` ;
 *   6. logiciel/vocabulaire cœur ailleurs (description) → `connexe` ;
 *   7. périphérie créative (graphiste, motion, UI/UX, CM…) ou catégorie Adzuna créative → `connexe` ;
 *   8. défaut **strict** → `hors_scope`.
 */
import type { Offre, Pertinence } from "@/domain/offre";
import { LOGICIELS_COEUR_MOTIFS, replier } from "./enrichir";

/**
 * ⚠️ **Le code ROME France Travail n'est PAS fiable pour promouvoir en cœur.** Sondage réel
 * (2026-06) : FT renvoie des offres **mal taxonomisées** — un « Cadre de santé » sous `L1510`
 * (Animateur 3D), un « Consultant SAP »/« Tech Lead Java » sous `M1831`/`E1125` (Lead
 * programmeur/graphiste jeux vidéo). L'appellation normalisée est tout aussi fausse dans ces cas.
 * → Pour FT, le ROME ne sert que de **plancher `connexe`** (appartenance au secteur, jamais perdu) ;
 *   le **cœur est piloté par le TITRE** (le rôle réellement affiché = la vérité terrain).
 */

/**
 * Catégories Adzuna **franchement hors-secteur** (taxonomie large mais fiable en négatif,
 * cf. `RD-TRI.md` §2.2). On NE bloque PAS `it-jobs`/`engineering-jobs`/`creative-design-jobs`/
 * `pr-advertising-marketing-jobs`/`retail-jobs` (sectoriels ou adjacents — ex. vente en boutique
 * de jeu, marketing de studio) : le tri par titre/défaut s'en charge.
 */
const CATEGORIES_ADZUNA_HORS = new Set([
  "accounting-finance-jobs", "sales-jobs", "customer-services-jobs", "hr-jobs",
  "healthcare-nursing-jobs", "hospitality-catering-jobs", "logistics-warehouse-jobs",
  "teaching-jobs", "trade-construction-jobs", "admin-jobs", "legal-jobs",
  "manufacturing-jobs", "scientific-qa-jobs", "social-work-jobs", "travel-jobs",
  "energy-oil-gas-jobs", "property-jobs", "charity-voluntary-jobs",
  "domestic-help-cleaning-jobs", "maintenance-jobs",
]);

/**
 * **Titre disqualifiant** → hors_scope (prime sur tout signal positif, même un logiciel cœur égaré
 * dans la description). Barre haute (R-1) : on ne disqualifie que sur le **rôle affiché**, jamais
 * sur le boilerplate. Couvre BTP/manuel, mécanique/usinage, CAO industrielle, électronique/SI pur,
 * finance/gestion, enseignement, escape game — métiers sans rapport avec un poste créatif 3D/jeu.
 */
const BRUIT_DUR = compiler([
  // BTP / manuel
  "macon", "cariste", "chauffeur", "chantier", "couvreur", "plombier",
  "electricien", "menuisier", "carrossier", "carrosserie", "facade",
  // mécanique / industrie / usinage
  "chaudronnier", "chaudronnerie", "usinage", "usineur", "fraisage", "fraiseur",
  "tournage numerique", "tourneur", "regleur", "ajusteur", "tuyauteur", "soudeur", "soudure",
  "materiaux composites", "metallier", "serrurier", "automaticien", "automatisme",
  "mecanique 3d", "conception mecanique", "bureau d'etudes mecanique",
  "3dx", "3dexperience", "solidworks", "catia", "creo",
  // impression 3D / prototypage matériel
  "impression 3d", "imprimante 3d", "prototypage rapide", "fabrication additive",
  // électronique / SI / dev hors secteur. ⚠️ Les motifs **ambigus** (sap/.net/java/oracle/erp) sont
  // sortis d'ici : ils tuaient des rôles studio légitimes (« .NET Gameplay Programmer », « Java Backend
  // Engineer » d'un studio) sur les filets larges. Ils ne sont du bruit que dans la **mauvaise
  // taxonomie France Travail** → traités séparément via `BRUIT_SI_TAXONOMIE` (conditionné au ROME).
  "fpga", "carte electronique", "developpeur php", "laravel", "symfony",
  "developpeur back", "administrateur systeme", "data engineer", "mdm",
  "business analyst", "developpeur bi", "business intelligence", "power bi",
  "cyber security", "cybersecurity", "cybersecurite",
  // dessin technique BTP / industriel
  "dessinateur industriel", "dessinateur btp", "dessinateur batiment",
  "dessinateur en agencement", "dessinateur projeteur", "projeteur",
  // finance / gestion / administratif
  "comptable", "comptabilite", "fiscaliste", "actuaire", "gestion de patrimoine",
  "gestionnaire de paie", "controleur de gestion", "auditeur financier",
  // commerce / vente / distribution (HelloWork fait remonter du **commerce de détail** de jeux
  // vidéo : « Vendeur Jeux Vidéo », « Assistant Librairie Jeux Vidéo » → PAS de la création 3D/jeu).
  "commercial lead", "responsable commercial", "directeur commercial",
  "attache commercial", "technico-commercial", "business developer", "chef de secteur",
  "vendeur", "vendeuse", "libraire", "librairie", "caissier", "caissiere",
  "employe de rayon", "hote de caisse", "hotesse de caisse",
  // santé / paramédical (FT mal-taxonomise ; « Unity » est aussi une marque d'appareil de radiothérapie !)
  "cadre de sante", "soins", "paramedical", "infirmier", "infirmiere", "aide-soignant",
  "linac", "radiotherapy", "radiotherapie", "radiology",
  // enseignement / académique (≠ poste en studio) — « adjunct »/« educator » = postes universitaires
  "teacher", "teaching", "lecturer", "professor", "professeur", "enseignant",
  "faculty", "tutor", "instructor", "adjunct", "educator",
  // loisirs / escape game (game master physique ≠ jeu vidéo)
  "escape game", "game master", "laser game",
]);

/**
 * Logiciel cœur dans le **titre** = signal cœur le plus fiable (un soft 3D/VFX/jeu affiché
 * dans le rôle, pas une mention égarée). Compilé depuis le lexique d'enrichissement.
 */
const REGEX_LOGICIELS_COEUR = compiler([...LOGICIELS_COEUR_MOTIFS]);

/**
 * **SI / ERP mal-taxonomisé par France Travail** : termes franchement « systèmes d'information /
 * gestion » qui n'ont de sens « bruit » **que** quand FT a collé un code ROME jeu vidéo sur un poste
 * d'entreprise (Consultant SAP, Dév Java/.NET d'ERP). Ambigus en absolu (un studio a des devs .NET/Java
 * légitimes) → on ne disqualifie sur ces motifs **que si un ROME est présent** (cf. règle 4bis).
 */
const BRUIT_SI_TAXONOMIE = compiler([
  "sap", "oracle", "salesforce", ".net", "java", "j2ee", "erp", "abap", "pl/sql",
]);

/**
 * **Rôles créatifs 3D/jeu** : intitulés sans ambiguïté **dans un titre** (généreux à dessein, car
 * le bruit industriel homonyme — « concepteur mécanique 3D », « modeleur » fonderie — est déjà
 * écarté par `BRUIT_DUR`). Bilingue FR/EN, replié.
 */
const COEUR_TITRE = compiler([
  "3d artist", "artiste 3d", "3d generalist", "generaliste 3d", "3d modeler", "modeleur 3d",
  "3d animator", "animateur 3d", "animatrice 3d", "cg artist", "cgi artist",
  "character artist", "chara artist", "char artist", "character animator", "character designer",
  "environment artist", "prop artist", "texture artist", "lighting artist",
  "fx artist", "vfx artist", "technical artist", "tech artist", "rigging artist", "rigger",
  "matte painter", "concept artist", "game artist", "game designer", "level designer",
  "level artist", "narrative designer", "gameplay programmer", "gameplay engineer",
  "engine programmer", "graphics programmer", "rendering engineer", "game programmer",
  "game developer", "unreal developer", "unity developer", "shader artist",
  "lookdev artist", "look dev artist", "directeur artistique jeu", "3d generalist artist",
  // rôles craft fréquents en ATS de studio (souvent sous un département = nom de produit)
  "lead artist", "art lead", "lead animator", "lead game designer", "network programmer",
  "tools programmer", "tools engineer", "graphics engineer", "rendering programmer",
  "ai programmer", "gameplay engineer", "engine developer", "audio designer", "sound designer",
]);

/**
 * **Vocabulaire métier cœur** (sémantique, bilingue). Dans le **titre** → `coeur` ;
 * **ailleurs** (description) → corrobore un `connexe`. Volontairement SANS les termes 3D
 * génériques (« modélisation 3D », « rendu 3D ») que la mécanique/BTP partagent.
 */
const COEUR_TEXTE = compiler([
  "jeu video", "jeux video", "jeu-video", "game design", "game dev", "gameplay",
  "level design", "narrative design",
  "vfx", "effets visuels", "visual effects", "compositing", "rotoscopie",
  "film d'animation", "films d'animation", "long metrage d'animation", "studio d'animation",
  "animation 3d", "character animation", "storyboard", "story board", "story boarder", "storyboarder",
  "rigging", "character artist", "environment artist", "matte painting", "previz",
  "motion capture", "mocap", "look dev", "lookdev", "concept art", "texturing",
]);

/**
 * **Familles métier AFJV** (3ᵉ catégorie du flux) qui prouvent le cœur. Les familles corporate
 * (« Support / CM », « Marketing / Com », « Production ») ne matchent pas → restent au plancher `connexe`.
 */
const FAMILLE_COEUR = compiler([
  "programmation", "graphisme", "art", "game design", "level design", "animation",
  "audio", "son", "vfx", "technique", "direction artistique", "concept", "narrative", "qa",
]);

/**
 * **Départements ATS « craft »** (Greenhouse/Lever/Ashby…) → `coeur` (cf. `RD-TRI.md` §5bis).
 * Les départements corporate (People/Legal/Finance/Sales) ne matchent pas → plancher `connexe`
 * (appliqué par le connecteur ATS). Mapping par mots-clés (libellés non standardisés entre studios).
 */
const DEPT_CRAFT = compiler([
  // Craft **jeu/3D** ciblé : on EXCLUT les départements génériques « Engineering »/« Software »
  // (sinon tout ingénieur backend/infra d'un studio passe en cœur). Les rôles tech-craft clairs
  // (« graphics engineer », « gameplay engineer », « tools programmer »…) sont captés par le titre.
  "programming", "programmer", "gameplay", "tools", "graphics", "render", "rendering", "engine",
  "art", "animation", "design", "level", "vfx", "fx", "audio", "sound",
  "technical art", "qa", "quality assurance", "narrative", "writer", "cinematic", "3d",
]);

/**
 * **Périphérie créative** du secteur (graphiste, motion, UI/UX, CM de studio, illustration…).
 * Pas le cœur 3D/jeu mais clairement dans l'écosystème → `connexe` (montré). Honore la consigne
 * « strict mais pas amputé » : la périphérie reste visible, seul le hors-sujet net est caché.
 */
const PERIPHERIE = compiler([
  "graphiste", "infographiste", "designer graphique", "graphic designer",
  "motion design", "motion designer", "motion graphics", "motion graphic",
  "community manager", "social media", "ui designer", "ux designer", "ui/ux",
  "web designer", "webdesigner", "directeur artistique", "art director",
  "illustrateur", "illustrator", "after effects", "montage video", "monteur video",
  "video editor", "2d artist", "storyboard", "archviz", "architectural visualization",
  "retouche photo", "videaste", "cadreur", "directrice artistique",
]);

function compiler(motifs: string[]): RegExp {
  const alt = motifs
    .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`(?<![a-z0-9])(?:${alt})(?![a-z0-9])`, "i");
}

/**
 * Détermine la pertinence d'une offre **déjà enrichie** (logiciels remplis) et munie de ses
 * **signaux structurés** de source (`offre.signaux`). Pur et déterministe.
 */
export function classer(offre: Offre): Pertinence {
  const titre = replier(offre.titre);
  const texte = replier(`${offre.titre}\n${offre.description ?? ""}`);

  const signaux = offre.signaux ?? {};
  const rome = signaux.rome;
  const categorieAdzuna = signaux.categorieAdzuna;
  const departement = signaux.departement ? replier(signaux.departement) : "";
  const famille = signaux.familleMetier ? replier(signaux.familleMetier) : "";

  // Signal cœur **fort** = logiciel ou rôle cœur affiché dans le TITRE (pas une mention égarée).
  const coeurTitre =
    REGEX_LOGICIELS_COEUR.test(titre) || COEUR_TITRE.test(titre) || COEUR_TEXTE.test(titre);

  // 1. Titre disqualifiant → caché. Prime sur tout (corrige « Automaticien » + « Unity » égaré).
  if (BRUIT_DUR.test(titre)) return "hors_scope";

  // 2. Catégorie Adzuna franchement hors-secteur → caché, SAUF signal cœur fort dans le titre
  //    (protège la rare offre studio mal catégorisée). « Teacher of Games Design » est déjà capté
  //    en (1) par le titre, donc l'exception ne le sauve pas.
  if (categorieAdzuna && CATEGORIES_ADZUNA_HORS.has(categorieAdzuna) && !coeurTitre) {
    return "hors_scope";
  }

  // 3. Signaux structurés cœur **fiables** → coeur. (Le ROME FT est exclu ici : trop d'erreurs de
  //    taxonomie à la source — cf. note plus haut ; il ne sert que de plancher connexe en (5).)
  //    ATS = département curé par le studio ; AFJV = board 100 % jeu vidéo, famille fiable.
  if (departement && DEPT_CRAFT.test(departement)) return "coeur";
  if (famille && FAMILLE_COEUR.test(famille)) return "coeur";

  // 4. Logiciel/rôle cœur dans le titre → coeur.
  if (coeurTitre) return "coeur";

  // 4bis. SI/ERP mal-taxonomisé par FT : ROME jeu vidéo collé sur un poste SI/gestion (Consultant SAP,
  //       Dév Java/.NET d'entreprise) → le ROME ne prouve pas le métier, c'est du bruit → caché. Ne
  //       touche PAS les filets larges sans ROME (un « .NET Gameplay Programmer » est déjà cœur en (4)).
  if (rome && BRUIT_SI_TAXONOMIE.test(titre)) return "hors_scope";

  // 5. Plancher de secteur : l'offre a été collectée via une taxonomie du secteur → jamais perdue.
  if (rome) return "connexe"; // tout code ROME présent ici EST un code du secteur (France Travail)
  if (famille) return "connexe"; // famille AFJV (même corporate) reste dans l'écosystème jeu vidéo

  // 6. Signal cœur présent ailleurs (description) → corroboration faible → connexe (montré).
  if (REGEX_LOGICIELS_COEUR.test(texte) || COEUR_TEXTE.test(texte)) return "connexe";

  // 7. Périphérie créative, ou catégorie Adzuna créative → connexe.
  if (PERIPHERIE.test(texte)) return "connexe";
  if (categorieAdzuna === "creative-design-jobs") return "connexe";

  // 8. Défaut STRICT : aucun signal du secteur → caché.
  return "hors_scope";
}
