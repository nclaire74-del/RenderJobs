# PRODUIT — Direction, parcours & règles

> **Boussole produit** du Hub d'Emploi 3D & Jeu Vidéo.
> Le *quoi* et le *pour qui* (ce doc) ; le *pourquoi technique* est dans `DECISIONS.md` ;
> la *vision* dans `plan-hub-emploi-3d.md` ; l'*état du chantier* dans `HANDOFF.md`.
> Décisions produit actées le **2026-06-02** (arbitrage propriétaire). Voir **ADR-0009**.

---

## 1. Personas (par priorité)

1. **🎓 Le junior / sortie d'école (cible n°1)** — étudiant ou diplômé récent en 3D/jeu/anim/VFX,
   cherche son **premier poste, stage ou alternance**. Mal servi par les boards généralistes.
   *Le produit lui parle d'abord : on met en avant junior / stage / alternance, et les sources juniors.*
2. **🎨 L'artiste confirmé / senior** — en poste, veut **bouger** (meilleur studio, remote, projet).
   Scanne vite, filtre par logiciel/spécialité. Pas la cible par défaut, mais pleinement servi.
3. **🧩 Le freelance** — cherche des **missions** (freelance/remote). Servi par les filtres contrat + remote.
4. **📣 Le contributeur** (Phase 2) — connaît une offre informelle (post LinkedIn « on recrute »),
   la **soumet** via formulaire/Discord. Fait vivre la communauté sans scraper de données perso.

> La cible n°1 oriente les **défauts** (tri, filtres pré-suggérés, mise en avant), pas le périmètre :
> **rien n'est exclu**, tous les niveaux/contrats sont présents et filtrables.

---

## 2. Parcours utilisateur (use cases)

### UC-1 — Le scan rapide *(cœur du produit)*
Arrive sans compte → voit **tout le flux trié par fraîcheur** → scanne → clique une offre →
atterrit sur la **page officielle** (attribution + lien d'origine). Zéro friction, zéro login.

### UC-2 — La chasse ciblée
Applique des filtres (**géo/pays, contrat, mode de travail** + différenciants **logiciel / spécialité /
niveau**) → flux réduit à ce qui le concerne. Filtres combinables, état lisible dans l'URL (partageable).

### UC-3 — La veille *(Phase 2)*
Pose ses critères une fois → reçoit les **nouvelles** offres correspondantes (Discord prioritaire, email).
Promesse « être le premier » : on n'alerte que sur du **vraiment nouveau** (dédup par identifiant).

### UC-4 — La contribution *(Phase 2)*
Colle le **lien** d'une offre informelle → validation humaine → entre dans le flux.
Capte le marché caché **sans** scraping de données personnelles (RGPD).

---

## 3. Règles produit tranchées (2026-06-02)

### R-1 — Pertinence : on ne perd JAMAIS une vraie offre ; le tri sépare, il ne supprime presque rien

> ⚠️ **Principe directeur (recadré 2026-06-02).** Le problème de fond du secteur, c'est la **pénurie
> et la dispersion** des offres : on n'en trouve pas. Un filtre qui **supprime** des offres travaille
> donc *contre* la mission. Le tri **organise l'affichage**, il n'élague pas. **Au moindre doute,
> l'offre est montrée.** Le doute profite toujours à l'offre, jamais l'inverse.

Chaque offre reçoit une **classe de pertinence** déduite par le pipeline :

| Classe | Définition | Destination |
|---|---|---|
| **`coeur`** | Clairement du secteur cible (jeu vidéo / VFX / film / animation / 3D artistique). | **Flux principal** |
| **`connexe`** | Tout ce qui n'est **pas manifestement hors-sujet** : lien plausible ou ambigu (3D générique, motion design, archviz, pub…). **Le doute va ici.** | **Onglet « offres connexes »** (2ᵉ flux consultable, pas une poubelle) |
| **`hors_scope`** | **Uniquement le bruit indiscutable**, sans aucun rapport avec un artiste (imprimante 3D, plans 3D du bâtiment, dessinateur industriel BTP…). | **Rejeté** |

*Pourquoi :* on protège la **confiance** (flux principal lisible) **sans jamais sacrifier la couverture**.
Le rejet est une **exception rare** réservée au bruit évident ; la barre pour `hors_scope` est **haute**.
En cas d'hésitation entre `connexe` et `hors_scope` → toujours **`connexe`** (montré). La classification
s'appuie sur les **mots-clés métier + logiciels connus** (cf. `SOURCES.md` § vocabulaire).

### R-2 — L'enrichissement annote, ne filtre jamais
Une offre **du secteur** mais au texte trop pauvre pour déduire logiciel/spécialité **s'affiche
normalement**, simplement sans ces étiquettes. *Une offre sans étiquette vaut mieux qu'une offre manquée.*
→ `logiciels`/`specialites` vides sont un état **valide**, jamais un motif d'exclusion.
*(La pertinence R-1, elle, peut exclure : ce sont deux décisions distinctes.)*

### R-3 — Périmètre : international d'emblée
On vise **FR + Europe + US/UK dès le départ**. Conséquences :
- **Sources** : **Adzuna** (multi-pays, débloquée) est la 1ʳᵉ source vivante ; FT reste pour la France ;
  boards anglophones (ArtStation, The Rookies…) intégrés tôt.
- **Enrichissement bilingue FR/EN** : dictionnaires de niveaux/spécialités doublés (les noms de
  **logiciels** sont déjà langue-neutres). Cf. ADR-0009.
- **Géographie** : le **pays** est un filtre de premier plan (pas seulement ville/rayon).

### R-4 — Langue : offres non traduites, UI française *(décision technique, ADR-0009)*
Les offres s'affichent **dans leur langue d'origine** (pas de traduction auto, risquée pour postuler).
L'**interface** est en **français** au lancement, mais codée **i18n-ready** (textes externalisés) pour
une traduction ultérieure sans refonte.

---

## 4. Edge cases & traitement décidé

| Cas | Traitement |
|---|---|
| **Bruit** (« 3D » hors secteur : impression, BTP, industriel) | Classé `hors_scope` (→ rejeté) **uniquement si indiscutablement hors-sujet**. Au moindre doute → `connexe` (montré). Le rejet est rare (R-1). |
| **Offre pauvre** (pas d'étiquette déductible) | Affichée telle quelle, sans filtres déduits (R-2). |
| **Doublon multi-sources** (même offre sur FT *et* Adzuna *et* board) | Dédup par `(source, source_id)` côté technique ; **dédup inter-sources** (titre+studio+url proches) à concevoir au pipeline — *à spécifier*. |
| **Offre morte** (pourvue/expirée encore en base) | Besoin d'une notion d'**état/péremption** (ex. `vue_le` glissant, ou statut). *À spécifier au pipeline.* |
| **Offre sans date de publication** | `publieLe` nullable → tri retombe sur `recupereLe`. À traiter dans le tri du dashboard. |
| **Offre sans pays/localisation** | Filtre géo : regroupée sous « Non précisé » plutôt qu'exclue. |
| **Texte en langue tierce** (ni FR ni EN) | Affichée si classée `coeur`/`connexe` ; enrichissement best-effort (logiciels surtout). |

---

## 5. Conséquences techniques à venir (résumé pour le chantier)

- **Modèle `Offre` + schéma DB** : ajouter un champ **`pertinence`** (`coeur`|`connexe`|`hors_scope`) ;
  envisager **`langue`** et un marqueur d'**état/fraîcheur** pour les offres mortes.
- **Pipeline** : étape de **classification de pertinence** (avant ou pendant l'enrichissement) ;
  dictionnaires d'enrichissement **bilingues** ; détection fine du niveau **junior** (variantes FR/EN).
- **Dashboard** : flux `coeur` par défaut + onglet `connexe` ; **filtre pays** de premier plan ;
  **mise en avant junior/stage/alternance** ; UI **i18n-ready**.
- **Sources** : prioriser **Adzuna** (débloque le flux pendant que FT est en attente de clés),
  puis **The Rookies** (juniors) et **ArtStation**.

> Ces points alimentent `HANDOFF.md` (prochaines actions). Toute spécification fine (dédup inter-sources,
> péremption) sera tranchée à l'implémentation et consignée si structurante.
