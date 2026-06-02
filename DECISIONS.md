# Journal de décisions (ADR)

Chaque choix technique structurant = une entrée courte : **contexte · options · décision · raison**.
C'est la couche de R&D documentée du projet. Le plus récent en bas. Versions vérifiées à la date indiquée.

---

## ADR-0001 — Framework : Next.js 16 + TypeScript

- **Date** : 2026-06-01
- **Contexte** : Il faut un front « dashboard » sombre + des routes API + du cron, le tout déployable simplement.
- **Options** : (a) Next.js full-stack ; (b) front Vite/React + backend Node séparé ; (c) Remix/React Router.
- **Décision** : **Next.js 16.2.x (App Router) + React 19 + TypeScript**, Turbopack par défaut.
- **Raison** : un seul outil pour front + API + cron (Vercel Cron), écosystème mûr, déploiement trivial.
  C'est aussi la stack recommandée par le plan. Version stable confirmée : 16.2.6 (mai 2026).
- **Conséquence** : Next 16 introduit des **breaking changes** ; consulter `node_modules/next/dist/docs/`
  avant d'écrire routing/API (cf. `AGENTS.md`).

## ADR-0002 — Style : Tailwind CSS v4

- **Date** : 2026-06-01
- **Contexte** : Dashboard sombre, épuré, rapide à itérer, pensé pour des artistes.
- **Options** : Tailwind v4 ; CSS Modules ; UI kit (MUI/Chakra).
- **Décision** : **Tailwind CSS v4** (4.3.0 confirmée stable, mai 2026).
- **Raison** : moteur 5–100× plus rapide, utilitaire, zéro lock-in composant, idéal pour un design sur mesure.

## ADR-0003 — Base de données : PostgreSQL auto-hébergé sur le serveur Linux + Drizzle ORM

- **Date** : 2026-06-01 — **révisé 2x le 2026-06-01** (Neon → PGlite → serveur Postgres auto-hébergé)
- **Contexte** : Besoin de plein-texte (filtres déduits) et de calcul géo (rayon de distance). Couche
  d'accès typée. **Contraintes de la propriétaire** : (1) minimiser les dépendances fournisseur et garder
  la main sur sa techno ; (2) **pas de compromis sur la qualité technique** ; (3) elle dispose d'un
  **serveur Linux personnel** dédié au dev/hébergement, sur lequel **Claude Code tourne directement**.
- **Décision** : **PostgreSQL serveur, installé et auto-hébergé sur le serveur Linux** (`192.168.1.175`),
  accédé via **Drizzle ORM**. Pas de service managé, pas de Docker, pas de PGlite : le vrai moteur,
  full puissance (plein-texte natif, extensions géo possibles, multi-connexions → site et robot séparés).
- **Raison** : le serveur Linux supprime tout compromis : on a un Postgres « pro » complet **et** zéro
  dépendance externe — tout vit sur la machine de la propriétaire. C'est le meilleur des deux mondes.
- **Conséquence** : le développement se fait **sur le serveur** (Claude Code natif Linux) ; la base, le
  robot de collecte et le site tournent au même endroit. Le PC Windows ne sert plus qu'à lancer la session.
- **Alternatives écartées** : Neon/Supabase (dépendance fournisseur) ; PGlite (mono-processus, inutile
  puisqu'on a un vrai serveur) ; Docker (superflu sur un Linux dédié) ; SQLite (dialecte différent) ;
  Prisma (moins de contrôle SQL).

## ADR-0004 — Validation des données externes : Zod

- **Date** : 2026-06-01
- **Contexte** : Les API/RSS externes (France Travail, boards) renvoient des formats variés et faillibles ;
  le parsing est une couche critique du pipeline.
- **Décision** : **Zod** pour valider/parser toute donnée entrant dans le système.
- **Raison** : schémas runtime + types TS inférés, échecs explicites au lieu de données corrompues en base.

## ADR-0005 — Tests : Vitest

- **Date** : 2026-06-01
- **Contexte** : La logique critique (normalisation, dédup, enrichissement logiciel/spécialité/expérience)
  doit être couverte par des tests.
- **Décision** : **Vitest** (+ tests unitaires sur le pipeline en priorité).
- **Raison** : rapide, ESM/TS natif, API proche de Jest, intégration simple avec l'écosystème Vite/Next.

## ADR-0006 — Première source : API France Travail

- **Date** : 2026-06-01
- **Contexte** : Fondation légale et gratuite du flux (plan §4). API officielle « Offres d'emploi ».
- **Décision** : Démarrer par l'**API France Travail** (OAuth2 client-credentials via `francetravail.io`),
  paramètres `motsCles` / `commune` / `rayon`. Détail d'intégration à confirmer sur le portail officiel
  lors de l'implémentation du connecteur.
- **Raison** : gratuite, officielle, riche, conforme RGPD/ToS — exactement l'« amorce » du plan.

## ADR-0007 — Posture de collecte : scraping agressif « zone grise » des offres publiques

- **Date** : 2026-06-01
- **Contexte** : La propriétaire a précisé après coup que le projet **repose largement sur le scraping**
  (la majorité des sources du secteur n'ont pas d'API) et doit être un « Joker » de la recherche d'emploi.
  Cela **révise** le principe initial du plan (« pas de scraping »).
- **Décision** : Collecte **agressive** des **offres d'emploi publiques** des sites sans API, y compris
  les sources dont les ToS la découragent (zone grise). Déploiement **par étapes** (atteignable/faible
  risque d'abord ; sources hostiles ensuite, une fois l'infra résiliente prête).
- **Ligne rouge maintenue (non négociable)** : **aucune donnée personnelle** (posts perso de recruteurs)
  → RGPD. Ces annonces passent par la **soumission communautaire**. Pas d'outil d'évasion à visée
  malveillante ; on bâtit un moteur résilient (vrai navigateur, rate-limiting, rotation, proxies).
- **Raison** : c'est la condition pour atteindre la couverture « Joker » dans un secteur où l'essentiel
  des offres vit sur des boards sans API. Risque assumé par la propriétaire (décision stratégique).
- **Conséquence** : on affiche toujours la source + lien d'origine (attribution) ; on isole le risque
  par source (un board qui bloque n'arrête pas les autres).

## ADR-0008 — Moteur de scraping : Playwright + stratégie « API d'abord »

- **Date** : 2026-06-01
- **Contexte** : Besoin d'un moteur de collecte robuste tournant en cron (5–15 min), capable de gérer
  des sites en JavaScript et des protections anti-bot raisonnables.
- **Options** : Playwright vs Puppeteer vs HTTP brut (cheerio/fetch) vs MCP Chrome interactif.
- **Décision** : **Playwright** (Chromium headless) pour le scraping de production, intégré au code et
  versionné. **HTTP brut + parsing** (fetch + cheerio) quand une page le permet (plus léger/rapide).
  **MCP Chrome** réservé à l'**exploration interactive** des sources en R&D (pas la prod ; non connectée
  pour l'instant). **Stratégie d'implémentation : API/RSS d'abord** (Tier 1–2 de `SOURCES.md`), scraping
  ensuite (Tier 3–4) — meilleur ratio couverture/risque/effort.
- **Raison** : Playwright = standard 2026, multi-navigateur, anti-détection raisonnable, fiable en CI.
  La séquence API→RSS→scrape donne de la valeur vite et concentre le risque là où il est nécessaire.
- **Conséquence** : architecture par **connecteurs** isolés (1 dossier/source) exposant `fetch()` +
  `normalize()` vers le type `Offre` commun ; chaque connecteur est testable et désactivable seul.

## ADR-0009 — Direction produit : pertinence, langue, périmètre, public

- **Date** : 2026-06-02
- **Contexte** : Avant d'attaquer le dashboard et l'enrichissement, cadrage des **arbitrages produit**
  (use cases / edge cases) restés ouverts. Décisions **stratégiques** prises par la propriétaire ;
  conséquences techniques tranchées par le lead dev. Détail des parcours/règles : **`PRODUIT.md`**.
- **Décisions** :
  1. **Pertinence en 3 classes** (`coeur` / `connexe` / `hors_scope`). **Principe directeur recadré
     (2026-06-02) : on ne perd JAMAIS une vraie offre — le tri organise l'affichage, il ne supprime pas.**
     Le rejet (`hors_scope`) est une **exception rare** réservée au **bruit indiscutable** (imprimante 3D,
     BTP…) ; **au moindre doute → `connexe`** (montré dans un 2ᵉ flux, pas une poubelle). → nécessite un
     champ **`pertinence`** sur l'`Offre` et une étape de **classification conservatrice** au pipeline.
  2. **L'enrichissement annote, ne filtre jamais** : une offre du secteur sans étiquette déductible
     est **affichée** (logiciels/spécialités vides = état valide). La *pertinence* (1) peut exclure ;
     l'*enrichissement* non. Deux décisions distinctes.
  3. **Périmètre international d'emblée** : FR + Europe + US/UK dès le départ. **Adzuna** (multi-pays,
     non bloquée) devient la **1ʳᵉ source vivante** ; FT couvre la France ; boards anglophones tôt.
     **Enrichissement bilingue FR/EN** (logiciels déjà neutres ; niveaux/spécialités doublés).
     Le **pays** devient un filtre de premier plan.
  4. **Langue** *(choix technique du lead dev)* : offres affichées **dans leur langue d'origine**
     (pas de traduction auto) ; **UI en français** au lancement mais **i18n-ready** (textes externalisés).
  5. **Public n°1 = juniors / sorties d'école** : oriente les **défauts** du dashboard (mise en avant
     stage/alternance/junior, source The Rookies tôt, détection fine du niveau débutant FR/EN).
     N'exclut personne — tous niveaux/contrats restent présents et filtrables.
- **Raison** : maximiser la **confiance** (flux propre) sans sacrifier la **couverture** (onglet connexes
  + enrichissement non filtrant) ; viser la promesse « Joker international » dès le départ ; servir en
  priorité un public mal adressé ailleurs (juniors). Coût assumé : enrichissement bilingue + UI i18n-ready.
- **Conséquence** : impacts modèle (`pertinence`, possiblement `langue` + état/péremption), pipeline
  (classification + dictionnaires bilingues), dashboard (flux+onglet, filtre pays, défauts juniors).
  Réordonne les priorités : **Adzuna avant le déblocage FT**. Détail vivant dans `HANDOFF.md`.

## ADR-0010 — Moteur générique (secteur = config) + refonte du connecteur France Travail (ROME)

- **Date** : 2026-06-02
- **Contexte** : Clés FT régénérées → auth OAuth + recherche **OK** (blocage HANDOFF levé). Décision de
  direction de la proprio : on **cible le secteur 3D/JV aujourd'hui, mais le code ne doit pas être verrouillé
  dessus** — la niche est un *paramètre*, pas une hypothèse codée en dur ; produit pensé pour **scaler**. En
  parallèle, R&D « maîtrise de l'API » : la collecte par **mots-clés** ramenait beaucoup de bruit (vendeur
  d'articles de sport, désinsectisation…).
- **Options** : (a) garder la recherche par mots-clés (haute couverture, mauvais ratio bruit) ; (b) cibler par
  **`codeROME`** (référentiel métier FT, haute précision) ; (c) hybride ROME + mots-clés complémentaires.
- **Décision** :
  1. **Moteur générique** : nouveau type `Secteur` (`src/domain/secteur.ts`) consommé par les connecteurs ;
     le **secteur actif** vit dans `src/config/secteur-actif.ts` (codes ROME + mots-clés). Changer de secteur
     = éditer ce fichier, sans toucher au moteur.
  2. **Connecteur FT par ROME** (option c) : recherche **par `codeROME`** (codes choisis *empiriquement* en
     sondant les `romeCode` réels des offres du secteur) + quelques mots-clés en filet. Pagination fiabilisée
     via l'en-tête **`Content-Range`** ; **plafond API 1150/critère** géré et **journalisé** (pas de troncature
     muette). `auth.ts` : **scope OAuth paramétrable** + cache par scope (réutilisable pour ROME/Marché du travail).
     `publieeDepuis` (défaut 31 j) borne la fraîcheur et le volume.
- **Raison** : précision >> bruit tant que le **classifieur de pertinence** (ADR-0009) n'existe pas — éviter
  une base saturée de hors-sujet. Le moteur générique sert la cible « scale » et n'engage pas le secteur.
- **Réconciliation avec ADR-0009** (« on ne perd jamais une vraie offre ») : ce principe gouverne l'étape de
  **classification** (ne pas *rejeter* au doute), pas le *scope de collecte*. Cibler par ROME est un scope
  assumé, **réglable par config** (élargir `codesRome`/`motsCles`) sans changement de code. **Une fois le
  classifieur de pertinence livré**, on pourra **élargir le filet** (plus de ROME + mots-clés) : le tri
  `connexe`/`hors_scope` masquera le bruit **sans perdre d'offre**. Tradeoff de couverture **assumé à court terme**.
- **Conséquence** : `MOTS_CLES_DEFAUT` codé en dur supprimé ; signature `fetchOffres(secteur, opts)`. Base
  repartie propre (TRUNCATE + recollecte) : **214 offres** nettement plus pertinentes, villes lisibles. Tests :
  `parseContentRangeTotal` + sanity config. **Point ouvert** : revisiter la **couverture (recall)** quand le
  classifieur arrivera (élargir le filet ROME/mots-clés).

## ADR-0011 — Pipeline pertinence + enrichissement (enrichir AVANT classer ; rejet sur le titre)

- **Date** : 2026-06-02
- **Contexte** : Avec 214 offres FT réelles en base, R&D sur la **qualité** : même ciblé par ROME, le
  flux contient ~21 % de bruit indiscutable (BTP, mécanique/CAO indus, impression 3D, escape game,
  dev web), et 38 % de « graphiste/infographiste/designer graphique » **ambigus**. Constat clé : le
  **titre seul ne suffit pas** à juger le cœur (« Designer graphique » peut être 3D *ou* PAO print) ;
  le vrai signal est dans la **description**, surtout **les logiciels cités** (Blender/Maya/Houdini/
  Unreal = cœur ; InDesign/PAO = print). Toutes les descriptions sont présentes (~1745 car. en moy.).
- **Décisions** :
  1. **Modèle** : ajout du champ **`pertinence`** (`coeur|connexe|hors_scope`, défaut `connexe`) et
     **`langue`** (ISO 639-1) à `Offre` + schéma + migration `0001` + index `(pertinence, publie_le)`.
  2. **Ordre du pipeline inversé vs HANDOFF** : `normalize → **enrichir → classer** → upsert`.
     L'enrichissement (déterministe, pur) **fournit le signal** (logiciels) que la classification
     consomme. `traiter()` compose les deux dans `collect.ts`.
  3. **Enrichissement** (`src/pipeline/enrichir.ts`, pur, bilingue FR/EN) : lexiques **logiciels**
     groupés par famille (3D/jeu = cœur ; motion ; print Adobe ; CAO indus ; AEC/archviz),
     **spécialités**, **niveau** (lead>senior>junior), **mode de travail**, **langue**. Repli
     accents+casse, frontières alphanumériques (lookbehind/lookahead) pour éviter les sous-mots.
     **N'annote jamais filtre** (R-2) ; n'écrase pas une valeur déjà fournie par la source.
  4. **Classification** (`src/pipeline/classer.ts`, pur) — règle **asymétrique**, fidèle à R-1 :
     - **cœur** = un **logiciel 3D/jeu** détecté (titre+desc) **OU** vocabulaire art/jeu exclusif.
       Le vocabulaire 3D *générique* (« modélisation 3D », « rendu 3D ») est **exclu** (la mécanique
       le partage). Les signaux cœur **priment sur le bruit** (jamais de rejet à tort).
     - **hors_scope** = mot de bruit indiscutable présent **dans le TITRE uniquement** (jamais le
       boilerplate de description : une entreprise du BTP qui recrute un graphiste reste un graphiste).
     - **connexe** = tout le reste (le doute profite à l'offre).
  5. **Upsert** : les champs déduits (logiciels/spécialités/experience/pertinence/langue) sont
     désormais **rafraîchis à chaque collecte** (déterministes) — l'ancien « ne pas réécrire » n'a
     plus lieu d'être.
- **Raison** : maximiser la **confiance** (flux cœur propre) **sans jamais perdre une vraie offre**.
  L'asymétrie titre/description est le cœur de la trouvaille : cœur = preuve dans la description ;
  rejet = certitude affichée dans le titre. Validé en réel : **12 cœur / 157 connexe / 45 hors_scope**,
  hors_scope = **100 % bruit légitime, 0 rôle artistique rejeté**.
- **Conséquence** : flux FR pur **mince** (~12 cœur) → confirme la priorité **Adzuna + boards
  anglophones** (ADR-0009) pour le volume international. Couverture enrichissement : 104/214 avec
  logiciel, 64 avec niveau. **Point ouvert** : recalibrer les seuils quand d'autres sources
  arriveront ; détection de langue à challenger sur du vrai contenu EN (FT = 100 % `fr`).

## ADR-0012 — 2ᵉ source : connecteur AFJV (RSS) + plancher de pertinence par source

- **Date** : 2026-06-02
- **Contexte** : Direction produit (la proprio) : la demande du secteur est **mince** → multiplier les
  sources, ne pas se limiter à France Travail. R&D web (cf. `SOURCES.md`, MAJ 2026-06-02) : **AFJV**
  (cœur jeu vidéo France) expose un **flux RSS ouvert** `emploi.afjv.com/rss.xml`, **sans clé** —
  meilleur ratio valeur/effort. (Adzuna jugé *optionnel* : agrégateur généraliste, faible densité niche.)
- **Décisions** :
  1. **Connecteur AFJV** (`src/sources/afjv/`) au même contrat que FT : `fetchOffres()` + `normalize()`
     Zod → `Offre`. Parse RSS via **`fast-xml-parser`** (nouvelle dép.). Extrait studio+ville de la
     `description` (« <studio> recrute… Poste basé à <ville> »), contrat+pays des `category`, `sourceId`
     du lien. `parseFlux()` séparé de `fetchOffres()` pour test hors-réseau. AFJV est **mono-secteur**
     → pas de ciblage `Secteur` (tout le flux est pertinent ; le tri range ensuite).
  2. **Plancher de pertinence par source** : `traiter(offre, { plancher })` extrait dans un module
     **pur** `src/pipeline/traiter.ts` (découplé de la DB, donc testable). Une source **curée** (board
     niche fiable) ne descend jamais sous son plancher. **AFJV → plancher `connexe`** : le classifieur
     générique ne sait pas que la source est déjà 100 % jeu vidéo, donc on l'empêche de **rejeter** à
     tort (ex. « Game Master » chez un studio VR = vrai métier du jeu, pas un escape game). FT (généraliste)
     → **pas de plancher**.
  3. **Correctif classifieur** (bénéficie aux 2 sources) : ajout des variantes `-er` au vocabulaire cœur
     (`level designer`, `narrative designer`, `game design`…) — la frontière alphanumérique faisait rater
     « level design**er** ».
  4. **Pipeline multi-sources** : `collectToutes()` = FT + AFJV, **isolées** (une source en échec n'arrête
     pas les autres). `npm run collect` lance les deux.
- **Raison** : volume **et** pertinence dans une niche pauvre ; le plancher réconcilie un classifieur
  générique avec des sources de confiance hétérogènes, sans casser R-1.
- **Conséquence** : base = **302 offres** (214 FT + 88 AFJV). AFJV : **36 cœur / 52 connexe / 0 hors_scope**
  (densité cœur ~41 % vs 5,6 % pour FT → valeur de la source niche confirmée). Tests : **39 verts**
  (`afjv/normalize`, `traiter`). **Point ouvert** : enrichir AFJV est limité (description RSS courte ~80
  car.) → envisager de **fetcher la page de détail** par offre (scraping léger) pour de meilleures
  étiquettes logiciels/spécialités.

## ADR-0013 — 3ᵉ source : connecteur Adzuna (international, par phrases métier)

- **Date** : 2026-06-02
- **Contexte** : La proprio a créé le compte Adzuna et fourni les accès (app « 333FM's AppDefault », *live*).
  Adzuna était jugé « optionnel » (ADR-0012), mais c'est le meilleur levier pour la promesse **« international
  d'emblée »** (ADR-0009) : une API JSON simple couvrant ~20 pays, là où FT = France et AFJV = FR/jeu vidéo.
- **Décisions** :
  1. **Connecteur Adzuna** (`src/sources/adzuna/`) au même contrat que les autres : `fetchOffres(secteur)` +
     `normalize()` Zod → `Offre`. API `…/jobs/{pays}/search/{page}` ; accès `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`.
  2. **Recherche par phrases métier** : Adzuna n'a pas de taxonomie type ROME → nouveau champ
     **`Secteur.requetesTexte`** (phrases discriminantes **bilingues** « game developer », « 3D artist »… ;
     pas de termes nus « 3D »/« game »). Indépendant de `Secteur.motsCles` (réservé au filet FT) pour **ne pas
     élargir FT par effet de bord**. Boucle **pays × phrases**, dédup par `id`, **pas de plancher** (net large
     → le pipeline classe). Cf. [[moteur-generique-secteur-config]].
  3. **Robustesse production** : throttle 1200 ms entre appels (rate limit) ; **429 → arrêt propre** ; 401/403
     → erreur (creds) ; autre erreur → requête ignorée + log ; `max_days_old=31`. Pays défaut `fr/gb/us`.
- **Raison** : couverture internationale immédiate à faible coût ; le classifieur conservateur + le statut
  `connexe` absorbent le bruit d'une source large sans perdre d'offre (R-1).
- **Conséquence** : base = **1357 offres** ; Adzuna apporte **1053** offres (US 395 / UK 336 / FR 322) →
  **201 cœur / 822 connexe / 30 hors_scope** : la classification bilingue tient sur l'anglais. Tests : connecteur
  Adzuna (`normalize`, `construireSalaire`, `mapContrat`). **Point ouvert** : dédup **inter-sources** (une même
  offre peut apparaître sur Adzuna **et** FT/board) — non gérée (clé d'unicité actuelle = `source`+`sourceId`).

## ADR-0014 — 4ᵉ source : Games-Career (RSS) + R&D d'expansion des sources (ATS publics, APIs remote)

- **Date** : 2026-06-02
- **Contexte** : Direction proprio : la demande étant **mince**, multiplier les sources gratuites. R&D web
  (vérifs réelles 2026-06) pour cartographier ce qui est branchable **sans clé/scraping**. Mise à jour
  complète de `SOURCES.md`.
- **Décisions / livrables** :
  1. **Connecteur Games-Career** (`src/sources/games-career/`) : flux RSS global `…/rss/Joboffer`,
     même contrat que les autres. Spécifs : titre « <Studio>: <Rôle> » (split), **`content:encoded`** =
     desc HTML complète → helper `stripHtml()` (texte brut riche pour l'enrichissement). `guid` → `sourceId`.
     Board curé jeu vidéo → **plancher `connexe`** (comme AFJV). Contenu **anglophone** → **valide
     l'enrichissement/langue sur EN** (11/11 détectées `en`).
  2. **R&D — gros déblocage documenté (pas encore codé) : API publiques d'ATS par studio** (🟢 sans auth,
     JSON, légal). Vérifié en réel : **Greenhouse** `boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
     (Riot = 185 offres), **Lever** `api.lever.co/v0/postings/{slug}?mode=json` (Voodoo = 34), **Ashby**.
     Pertinence ~100 % (offres directes des studios). **Caveat** : slugs à curer un par un → futur
     connecteur **générique ATS** piloté par une liste `src/config/studios.ts`. **Candidat n°1** pour la
     prochaine grosse étape source.
  3. **R&D — APIs remote gratuites sans auth** (Himalayas, Jobicy, RemoteOK, Arbeitnow) : volume + EN,
     mais génériques (filtrage niche requis). Priorité moindre.
- **Raison** : maximiser la couverture niche à coût/risque minimal (API/RSS d'abord, ADR-0008) ; l'ATS
  ouvre une **nouvelle classe de sources** très haute pertinence sans scraping.
- **Conséquence** : 4 sources vivantes ; base ≈ **1409 offres** (FT 215 / AFJV 89 / Adzuna 1094 /
  Games-Career 11). Tests : `games-career` (`stripHtml`, `lireTitre`, `parseFlux`, `normalize`) → **57 verts**.
  **Point ouvert** : sur un board curé, le vocabulaire cœur trouvé dans la *description* peut **sur-promouvoir**
  en `coeur` un rôle support (ex. « Monetization Manager » dont la JD cite « game design ») — sens sûr (R-1),
  à surveiller au dashboard ; raffinement possible = exiger le signal cœur dans le **titre** pour ces sources.

## ADR-0015 — Dashboard MVP (Phase 1) : flux cœur/connexes, filtres URL, attribution + route cron

- **Date** : 2026-06-02
- **Contexte** : 1409 offres en base, pipeline livré, mais **aucune UI** (app = template Create-Next-App).
  Priorité n°1 du HANDOFF : rendre le produit **visible et testable** par la proprio (UC-1/UC-2, `PRODUIT.md`).
- **Décisions** (choix techniques du lead dev) :
  1. **Server Components + accès DB direct** (Next 16, « fetching data with an ORM ») : la page `/` est
     un Server Component `async` qui lit `searchParams` (Promise en Next 16) et interroge Postgres via une
     **couche `src/lib/offres-repo.ts`** (Drizzle). Pas d'API REST intermédiaire pour la lecture, pas de JS
     client → rendu simple, rapide, dynamique.
  2. **État dans l'URL** (UC-2 partageable) : filtres = `searchParams` (`vue`, `pays`, `contrat`,
     `experience`, `q`, `page`). Barre de filtres = simple `<form method="get">` (zéro JS client) ;
     onglets/pagination/raccourcis = liens (`src/lib/url.ts` construit les hrefs).
  3. **2 onglets** : `coeur` (défaut) + `connexe` ; **`hors_scope` jamais affiché** (R-1). Tri par fraîcheur
     `publie_le desc nulls last` puis `recupere_le`. Pagination par tranches de **60**.
  4. **Attribution** (CLAUDE.md §6) : chaque carte affiche la **source** + lien direct `target=_blank
     rel=noopener nofollow` vers l'annonce. Étiquettes enrichies mises en avant (logiciels = ton distinct).
  5. **Cible juniors** (persona n°1) : raccourcis stage/alternance/junior dans la barre de filtres.
  6. **i18n-ready** (R-4) : tous les libellés dans `src/lib/i18n.ts` (locale `fr`), aucun texte en dur dans
     les composants → ajout d'`en` ultérieur sans refonte. Thème **sombre** (ADR-0002).
  7. **Route cron** `POST|GET /api/cron/collect` protégée par `Authorization: Bearer ${CRON_SECRET}`
     (convention Vercel Cron) → `collectToutes()`. 401 sans secret (vérifié en réel).
- **Raison** : livrer vite un MVP utilisable et conforme aux règles produit, sans dette (pas de client lourd,
  URL partageables, textes externalisés).
- **Conséquence** : `tsc` + `eslint` + **build** + **57 tests** verts. Rendu vérifié en réel (serveur prod sur
  port temporaire) : flux cœur/connexes, filtres pays/contrat (France+stage = 17), recherche `q`, pagination,
  badge d'onglet (251 cœur), cron 401 sans secret. **Points ouverts** : (a) **faux positifs de classification**
  visibles dans le flux cœur (« Substance Use Counselor » promu via le logiciel *Substance* ; « Chef de projet
  SI » marqué vfx/animation) → à corriger côté `enrichir`/`classer` (frontières de mots, ancrage titre) ;
  (b) pas encore de **dédup inter-sources** (ADR-0013) ni de **péremption** des offres mortes ; (c) détail
  d'offre = lien externe uniquement (pas de page interne — volontaire pour le MVP, attribution directe).

## ADR-0016 — Tri en couches « signaux structurés d'abord » + mode strict (anti-bruit)

- **Date** : 2026-06-02
- **Contexte** : au dashboard, le flux cœur ET l'onglet connexes laissaient passer du **hors-sujet net**
  (usineur/tourneur, automaticien, consultant SAP, cadre de santé, profs, gestion de patrimoine, escape-game
  « Game Master »…). Cause racine (cf. `RD-TRI.md`) : le classifieur était **100 % textuel** et **jetait les
  signaux structurés** des sources au `normalize()` ; son défaut « dans le doute → connexe » faisait de
  l'onglet connexes un déversoir. **Décision produit de la proprio** : resserrer → mode **strict**.
- **Décisions** (lead dev) :
  1. **Sac de signaux transient** `Offre.signaux: Record<string,string>` rempli par chaque `normalize()`
     (FT : `rome`/`appellation`/`domaineFormation` ; Adzuna : `categorieAdzuna` ; AFJV : `familleMetier`),
     consommé par `classer`. **Non persisté** (le tri tourne avant l'upsert) → aucune migration DB.
  2. **Classifieur en couches** (`classer.ts`) : (1) titre disqualifiant → `hors_scope` (prime sur tout) ;
     (2) catégorie Adzuna hors-secteur → `hors_scope` sauf signal cœur fort ; (3) signal structuré **fiable**
     (département ATS craft, famille AFJV craft) → `coeur` ; (4) **logiciel/rôle cœur dans le TITRE** → `coeur` ;
     (5) plancher de secteur (ROME FT, famille AFJV) → `connexe` ; (6) signal cœur en description → `connexe` ;
     (7) périphérie créative / catégorie Adzuna créative → `connexe` ; (8) **défaut STRICT → `hors_scope`**.
  3. **Le code ROME France Travail n'est PAS un signal cœur** : sondage réel → FT mal-taxonomise
     (« Cadre de santé » sous `L1510` Animateur 3D ; « Consultant SAP »/« Tech Lead Java » sous `M1831`/`E1125`).
     → le ROME ne sert que de **plancher `connexe`** ; **le cœur est piloté par le titre** (vérité terrain).
  4. **Anti-perte préservé (R-1)** : seules les sources à **filet large** (Adzuna par phrases) peuvent tomber
     en `hors_scope` ; les sources **ciblées par taxonomie** (FT par ROME) ou **curées** (AFJV/Games-Career,
     plancher `connexe`) ne descendent jamais sous `connexe`.
  5. **Péremption** : purge des offres non rafraîchies par la dernière collecte (cohérent fraîcheur). Fait en
     SQL cette session ; **à automatiser dans le pipeline** (point ouvert).
- **Raison** : transformer le tri d'un problème d'heuristique de texte (fragile) en un problème de **mapping de
  taxonomies** (testable), fidèle à la R&D `RD-TRI.md`, et honorer la consigne produit « strict ».
- **Conséquence** : recollecte réelle → **coeur 218 / connexe 362 / hors_scope 832** (connexe −66 % vs 1083).
  Faux positifs éliminés (vérifié), faux négatifs récupérés (« Chara Artist 3D », « Character Animation Lead »).
  `tsc` + `eslint` + **63 tests** verts. **Ferme les points ouverts (a) et (b) d'ADR-0015.**
  **Points ouverts** : automatiser la purge dans le cron ; persister `signaux` (jsonb) si l'on veut reclasser
  sans re-fetch ; quelques ambigus industriels volontairement cachés en strict (simulateur de vol, 3D auto,
  « dév. 3D temps réel » pour la simulation) — rééquilibrable si la proprio le souhaite.

## ADR-0017 — Connecteur générique ATS (Greenhouse/Lever/Ashby) piloté par liste de studios

- **Date** : 2026-06-02
- **Contexte** : base trop pauvre côté **offres directes de studios**. R&D (ADR-0014, `RD-TRI.md` §5bis) :
  les ATS publics (sans clé) sont le **meilleur levier cœur** du projet (~100 % industrie du jeu).
- **Décisions** (lead dev) :
  1. **Connecteur unique générique** `src/sources/ats/` avec un **adaptateur par plateforme**
     (Greenhouse `boards-api`, Lever `v0/postings`, Ashby `posting-api`), un format intermédiaire
     `OffreAts` puis un `normalize()` commun. Schémas **Zod** + `safeParse` par item, résilient
     (un studio en échec est journalisé et ignoré). HTML décodé+nettoyé (Greenhouse `content`).
  2. **Liste curée** `src/config/studios.ts` (`slug` + `ats` + `nom`), **mappings vérifiés en réel**
     (sondage des 3 endpoints). 13 studios : Riot, Roblox, Epic, Scopely, Rockstar, Naughty Dog
     (Greenhouse) ; Voodoo, Kabam, Avalanche, Jam City (Lever) ; Supercell, thatgamecompany,
     Second Dinner (Ashby). **Discord écarté** (plateforme SaaS, pas un studio).
  3. **Signal de tri = département/équipe** (`signaux.departement`) : un studio = 100 % industrie du
     jeu mais PAS 100 % craft (corporate Finance/Legal/People). **Plancher `connexe`** par studio connu
     (jamais perdu) ; **`DEPT_CRAFT` ciblé jeu** (gameplay, art, animation, design, audio, graphics,
     render, tools, programming, vfx, narrative…) → `coeur`. **« Engineering »/« Software » génériques
     volontairement EXCLUS** du craft (sinon tout ingénieur backend/infra passe en cœur sur un board
     3D/jeu) ; les rôles tech-craft clairs (« graphics engineer », « gameplay programmer », « tools
     programmer »…) restent captés par le **titre**.
- **Raison** : remplir le flux cœur d'offres studios à haute pertinence, sans clé ni scraping, avec un
  tri quasi déterministe par département (fidèle à `RD-TRI.md`).
- **Conséquence** : `tsc` + `eslint` + **71 tests** verts. Collecte réelle : **+998 offres ATS** →
  **coeur 413** (craft jeu pur), **connexe 1165**, **hors_scope 830** ; **base totale 2408** (vs 1409, +71 %).
  **Points ouverts** : (a) l'onglet **connexes est volumineux** (corporate + ingénierie générique de
  studios) — décision produit possible : le restreindre ; (b) ajouter d'autres ATS (Workable/Recruitee/
  Personio = AAA sur Workday hors périmètre) et plus de studios ; (c) **dédup inter-sources** (un poste
  studio peut aussi être sur Adzuna) toujours non gérée ; (d) automatiser la **purge des offres périmées**.

## ADR-0018 — Connecteur RemoteGameJobs (scraping léger fetch+cheerio) : 1er board Tier 3
- **Date** : 2026-06-02.
- **Contexte** : la proprio constate l'absence des « gros » boards (HelloWork, Indeed, LinkedIn,
  ArtStation, GameRemote, 80 Level). Tous nécessitent du **scraping** (pas d'API/RSS), avec des
  niveaux de risque très différents. Décision produit (proprio, ce jour) : **commencer par les
  boards niche jeu/3D** (vrai gisement, faisables proprement), avant les hostiles (ArtStation/Indeed
  = anti-bot ; LinkedIn = ⚫ ligne rouge RGPD → jamais en auto). Premier ouvre la **phase scraping**.
- **R&D accès** (sondage réel) : la plupart des boards niche n'ont **ni RSS ni JSON** exploitable
  (3DVF a un flux mais la catégorie « offres-emploi » est vide ; 80.lv `/feed/` = articles, pas jobs ;
  GameJobs.co = SPA Next.js). **RemoteGameJobs** rend en revanche ses **33 offres directement dans le
  HTML** (app Rails server-rendered, classes Bulma) → **`fetch` + cheerio suffit, pas de Playwright**.
- **Décisions** (lead dev) :
  1. **Connecteur `src/sources/remote-game-jobs/`** au contrat habituel : `fetchOffres()` →
     `parseListe(html)` (cheerio, **testable hors-réseau**) → `normalize()` → `Offre`. Nouvelle dép.
     **`cheerio`** (parsing HTML léger ; Playwright réservé aux boards SPA/anti-bot à venir).
  2. **Extraction** par offre : titre (`strong.f-20`), studio (`small.f-15`), lieu (icône `fa-map-pin`),
     contrat (icône `fa-file-signature` → `mapContrat`), tags compétences (`span.tag.is-warning`).
     Les **tags** (C++, Unity, Maya, 3D Art… — multiples et hétérogènes, **pas** une famille métier
     propre) sont **injectés dans la description** pour nourrir l'enrichissement (logiciels), **pas**
     passés comme signal `familleMetier`. `modeTravail` = **`remote`** (board 100 % remote).
  3. **Board curé 100 % jeu vidéo → plancher `connexe`** (comme AFJV/Games-Career) : jamais rejeté ;
     le **cœur reste piloté par le titre** (philosophie `classer.ts`). `sourceId` = slug d'URL.
- **Raison** : ouvrir la phase scraping par le ratio valeur/risque/effort le plus favorable (cheerio,
  HTML stable, offres 100 % jeu), sans infra lourde.
- **Conséquence** : `tsc` + `eslint` + **78 tests** verts (+7). Collecte réelle : **33 offres** →
  **17 coeur / 16 connexe / 0 hors_scope** (tri par titre OK : Producer/Support/Backend → connexe).
  **Points ouverts** : (a) quelques rôles d'animation (« Technical Animator », « Animation Lead »)
  en connexe alors que légitimement cœur → réglage **classifieur** (bare « animator » non promu car
  « animateur » FR ambigu) ; (b) pas de pagination serveur (33 = liste courante) ; (c) description =
  liste courte → fetch optionnel de la page de détail plus tard ; (d) **dédup inter-sources** toujours
  ouverte. **Prochains boards** : Hitmarker, GameJobs.co (SPA → Playwright), The Rookies, 3DVF.

## ADR-0019 — Connecteur Hitmarker via sitemap + JSON-LD JobPosting (sans Playwright)
- **Date** : 2026-06-02.
- **Contexte** : Hitmarker = **plus gros board gaming/esport mondial** (demande proprio). Sa liste
  HTML est rendue **en JS** (~8 offres statiques) et **ne pagine pas par URL** → scraping de liste
  impossible sans navigateur. **R&D (sondage réel)** : deux voies propres existent — (1)
  `sitemap-jobs.xml` = **5000 URLs d'offres + `<lastmod>`, triées récent→ancien** ; (2) chaque page
  d'offre porte un **JSON-LD `JobPosting`** (schema.org) complet (titre/entreprise/lieu/type/date/desc).
- **Décisions** (lead dev) :
  1. **`src/sources/hitmarker/`** : `fetchOffres({max})` = sitemap (1 req) → N pages les plus
     récentes (défaut **150**, throttle 250 ms, **résilient** : page en échec/sans JSON-LD ignorée).
     `extraireSitemap()` (fast-xml-parser) + `parseJobPosting()` (cheerio + **Zod**, tolérant
     array/objet/@graph) **testables hors-réseau** ; `normalize()` → `Offre` (sourceId = id numérique
     d'URL ; contrat via `employmentType` ; lieu via `jobLocation.address` ; desc HTML→texte).
  2. **PAS de plancher `connexe`** (contrairement à AFJV/ATS) : Hitmarker porte des **listings
     d'entreprises entières** (ex. **NVIDIA** santé/banque/robotique = hors 3D). Comme Adzuna, c'est un
     **filet large** → le **classifieur strict filtre** (cf. ADR-0016) ; le cœur est piloté par le titre.
- **Raison** : capter un gros board hostile au scraping **sans Playwright**, via des données
  **standardisées** (bien plus stables que du CSS), tout en respectant le tri strict.
- **Conséquence** : `tsc` + `eslint` + **88 tests** verts. Collecte réelle (150 récentes) : **140
  offres** (10 pages sans JSON-LD ignorées) → **22 cœur / 24 connexe / 94 hors_scope** (NVIDIA &
  corporate correctement **cachés**). Base ≈ **2581** offres (7 sources). **Points ouverts** : (a) le
  flux récent du sitemap est **dilué** par les gros posteurs (NVIDIA) → rendement ~30 % pertinent/run
  (acceptable, s'accumule) ; (b) `validThrough` souvent absent → péremption gérée par la **purge** ;
  (c) **The Rookies écarté** (Cloudflare + aucun sitemap/API d'offres → Tier 4, Playwright+proxies).

## ADR-0020 — Purge automatique des offres périmées (fraîcheur de la base)
- **Date** : 2026-06-02.
- **Contexte** : l'upsert ne supprime jamais → les offres pourvues/expirées s'accumulent (purge faite
  **à la main** les sessions précédentes). Demande explicite proprio : « purge des offres quand la
  date est dépassée ». Principe produit « fraîcheur ».
- **Décisions** (lead dev) :
  1. **Stratégie universelle, source-agnostique** : toute offre encore présente chez sa source voit
     son `recupere_le` rafraîchi à chaque collecte (`upsert.ts`). Donc une offre dont le `recupere_le`
     **n'a pas bougé depuis > `joursMax` jours** n'est plus listée → **morte** → supprimée. Pas besoin
     de connaître la pagination de chaque source (robuste pour FT plafonné, Adzuna paginé, Hitmarker
     capé). `joursMax` défaut = **30** (cohérent avec FT `publieeDepuis=31j` / Adzuna `max_days_old=31`).
  2. **`src/pipeline/peremption.ts`** (pur, testé : `seuilPurge`) + **`src/pipeline/purge.ts`**
     (`purgeOffresPerimees` → `DELETE WHERE recupere_le < seuil`, retourne le nb supprimé).
  3. **Orchestration `collecterEtPurger()`** (collect.ts) appelée par la **route cron** et `npm run
     collect`. **Garde-fou** : ne purge **que si au moins une source a réussi** (sinon une panne réseau
     globale — aucun `recupere_le` rafraîchi — viderait la base). Réponse cron : champ `purgees`.
- **Raison** : fraîcheur temps réel automatique, sûre (garde-fou anti-vidage), simple et universelle.
- **Conséquence** : vérifié en réel — purge à blanc = 0 (tout frais) ; offre injectée à −40 j =
  supprimée ; offres récentes intactes. 3 tests purs (`seuilPurge`). 88 tests verts au total.

## ADR-0021 — 3 sources gains-faciles : GameJobs.co (Atom), RemoteOK (API), HelloWork (JSON-LD)
- **Date** : 2026-06-02.
- **Contexte** : objectif proprio « base **riche** ». R&D : flux/API propres existants, + HelloWork
  explicitement demandé. Sondage réel : GameJobs.co a un **flux Atom** (`/?format=atom`, 100 entrées) ;
  RemoteOK une **API JSON** (`?tags=design`) ; **HelloWork** = page de recherche server-rendered
  (sans Cloudflare) + **JSON-LD JobPosting riche** par offre (salaire €, `validThrough`).
- **Décisions** (lead dev) :
  1. **`src/sources/gamejobs-co/`** (Atom, `fast-xml-parser`) : titre « <Rôle> at <Studio> », `id`=URL.
     Board curé game dev → **plancher `connexe`**. Flux minimal (pas de description → tri sur le titre).
  2. **`src/sources/remoteok/`** (API JSON, ignore la mention légale sans `position`) : tags→description,
     salaire USD, mode remote. **Attribution honorée**. Généraliste → **pas de plancher** (tri strict).
  3. **`src/sources/hellowork/`** (recherche FR par phrases métier → URLs → JSON-LD, comme Hitmarker) :
     salaire € (MonetaryAmount→texte), lieu FR, **ignore les offres expirées** (`validThrough` < now).
     Généraliste FR → **pas de plancher** (tri strict).
  4. **Correctif tri (classer.ts)** : HelloWork fait remonter du **commerce de détail** de jeux vidéo
     (« Vendeur Jeux Vidéo », « Assistant Librairie ») promu cœur via « jeux vidéo ». → ajout à
     `BRUIT_DUR` : vendeur/vendeuse/libraire/librairie/caissier/employé de rayon/hôte(sse) de caisse.
- **Conséquence** : `tsc`+`eslint`+**101 tests** (+13). Réel : GameJobs.co **100** (31 cœur/69 connexe),
  RemoteOK **95** (0 cœur/46 connexe/49 cachées — densité 3D faible, volume créatif), HelloWork **125**
  (25 cœur/57 connexe/43 cachées) — cœur FR pertinent (Gameplay Animator BGE2, 3D Animator…), faux
  positifs retail **éliminés**. **10 sources**, base ≈ **2900 offres**. Indeed/LinkedIn restent ⚫/🔴.

## ADR-0022 — Fraîcheur « quasi temps réel » : cron système à deux vitesses + lecture DB directe
- **Date** : 2026-06-02.
- **Contexte** : exigence proprio — la base doit **s'actualiser en temps réel** (« dès qu'une offre est
  faite, elle apparaît sur le site »). Réalité : nos sources se **sondent** (RSS/API/scraping), donc
  « temps réel » = **polling fréquent**. Le dashboard est un Server Component **dynamique** (lit
  `searchParams`, aucun cache/revalidate) → il lit Postgres **à chaque requête** : dès qu'une offre est
  en base, elle s'affiche. Manquait l'**ordonnanceur**.
- **Décisions** (lead dev) :
  1. **Cron système** (`crontab` de `clara`, le serveur est l'hôte de prod auto-hébergé, ADR-0003) à
     **deux vitesses**, pour la fraîcheur **sans marteler** les sites : **toutes les 20 min** les
     sources **légères** (1 requête : AFJV, Games-Career, GameJobs.co, RemoteOK, RemoteGameJobs, ATS)
     via `collecterLegerEtPurger()` ; **toutes les 2 h** la **collecte complète** (+ FT, Adzuna,
     Hitmarker, HelloWork = multi-requêtes/quota) via `collecterEtPurger()`.
  2. **`scripts/cron-collect.sh`** : `flock -n` (verrou par mode) empêche tout chevauchement ; logs
     horodatés dans `collect.log` (gitignore). `scripts/collect.ts` accepte `-- leger`.
  3. **`collectLeger()` / `collecterLegerEtPurger()`** ajoutés à `collect.ts` (la purge tourne dans les
     deux modes, idempotente, avec le garde-fou « au moins une source réussie »).
- **Raison** : effet « live » sur les flux niche jeu/3D les plus frais, tout en restant **poli** envers
  les sources lourdes ; aucune dépendance à Vercel (auto-hébergé).
- **Conséquence** : crontab installé (démon `cron` actif), wrapper léger vérifié en réel (~1 min, purge
  incluse). **Limite assumée** : latence ≤ 20 min (léger) / 2 h (complet), pas l'instantané strict.
  **Évolutions** : affiner les cadences si une source rate-limite ; collecte incrémentale Hitmarker via
  `<lastmod>` du sitemap (éviter de re-fetch 150 pages à chaque run) ; webhooks si une source en offre.

## ADR-0023 — +3 sources niche 3D/jeu : Work With Indies (RSS), PixelCareer (RSS), 80 Level (JSON)
- **Date** : 2026-06-02.
- **Contexte** : poursuite des gains faciles, mais **ciblés 3D/jeu** (vs RemoteOK/The Muse généralistes).
  R&D : Work With Indies expose un **RSS** (`careers/rss.xml`, 100), PixelCareer un **RSS jobs**
  (`/jobs/feed/`), 80 Level un **JSON embarqué** (`__NEXT_DATA__`, ~10 récents/70). The Muse écarté
  (catégorie « Design & UX » = UX généraliste, faible densité 3D).
- **Décisions** (lead dev) : 3 connecteurs au contrat habituel, tous **boards curés** → plancher
  `connexe` ; tous **légers** (1 requête) → ajoutés à `collectLeger()` (cron 20 min).
  1. `src/sources/work-with-indies/` (RSS) : titre « <Studio> is hiring a <Rôle>… » → `lireTitre`
     (coupe le préambule de lieu) ; tags dans la description.
  2. `src/sources/pixelcareer/` (RSS) : titre = rôle ; studio non structuré (dans le texte → `null`).
  3. `src/sources/80-level/` (JSON `__NEXT_DATA__` via cheerio) : `company.title`→studio, city/country,
     tags+desc, `slug`→URL `80.lv/jobs/{slug}`.
  - **Fix** : `sourceId` ne doit retirer que query/fragment + slash final (pas couper au 1er slash) →
    corrigé pour les chemins `/careers/{slug}` et `/jobs/{slug}/`.
- **Conséquence** : `tsc`+`eslint`+**113 tests** (+12). Réel : WWI **100** (41 cœur/59 connexe),
  PixelCareer **6** (5 cœur), 80 Level **10** (4 cœur) — 0 rejet (plancher). **13 sources**, base ≈ **3127**.
