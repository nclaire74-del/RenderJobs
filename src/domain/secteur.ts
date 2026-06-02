/**
 * Le **secteur ciblé** est une *configuration*, pas une hypothèse codée en dur.
 *
 * Le moteur (connecteurs, collecte, enrichissement) reste **générique** : il reçoit un
 * `Secteur` en paramètre et ne connaît rien du métier « 3D / jeu vidéo » en lui-même.
 * On peut donc rouvrir le périmètre (autre secteur) sans toucher au moteur — seul change
 * l'objet de config (cf. `src/config/secteur-actif.ts`).
 *
 * Aujourd'hui un seul secteur actif ; demain on pourrait en activer plusieurs.
 */

/** Critères de ciblage d'un secteur, consommés par les connecteurs de sources. */
export interface Secteur {
  /** Identifiant court et stable, ex. "3d-jeu-video". */
  id: string;
  /** Libellé lisible, ex. "3D / Jeu vidéo / VFX / Animation". */
  libelle: string;

  /**
   * Codes ROME ciblés (référentiel métier France Travail) — **filtre principal**,
   * bien plus fiable que les mots-clés. Chaque code est interrogé séparément puis
   * les résultats sont dédupliqués. Vide = pas de filtre ROME pour cette source.
   */
  codesRome: string[];

  /**
   * Mots-clés **complémentaires** (optionnels) pour ce que le ROME ne couvre pas bien.
   * À utiliser avec parcimonie : ramène plus de bruit que `codesRome`.
   */
  motsCles?: string[];

  /**
   * **Requêtes texte** du secteur, pour les sources **pilotées par mots-clés** (Adzuna,
   * boards, scrapers) qui n'ont pas de taxonomie type ROME. Liste plus riche et bilingue
   * (FR/EN), faite de **phrases métier discriminantes** (« game developer », « 3D artist »…)
   * plutôt que de termes nus ambigus (« 3D », « game ») — chaque phrase est interrogée
   * séparément puis dédupliquée. Le bruit résiduel est trié par le pipeline (pertinence),
   * qui ne perd jamais d'offre. Indépendant de `motsCles` (réservé au filet FT).
   */
  requetesTexte?: string[];

  // À venir (étape enrichissement) : dictionnaires logiciels / spécialités propres au
  // secteur. Ils vivront ici pour que l'enrichissement reste lui aussi piloté par config.
}
