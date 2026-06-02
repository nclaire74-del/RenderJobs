# HANDOFF — Point de reprise

> À lire en premier au démarrage d'une session (avec `CLAUDE.md` + `DECISIONS.md`).
> Mis à jour avant chaque `/clear`. Format court et opérationnel.

**Dernière mise à jour** : 2026-06-02 (session : **R&D boards + Hitmarker + PURGE auto** — ADR-0019/0020)
**Phase en cours** : **Phase 1 (MVP)**. **7 sources vivantes** : **France Travail** (API, ROME) +
**AFJV** (RSS, jeu vidéo FR) + **Adzuna** (API, ~20 pays) + **Games-Career** (RSS, jeu vidéo EU/EN) +
**ATS studios** (Greenhouse/Lever/Ashby, 13 studios curés, sans clé) +
**RemoteGameJobs** (board jeu vidéo remote, fetch+cheerio, 33 offres) +
**🆕 Hitmarker** (plus gros board gaming/esport mondial — **sitemap + JSON-LD JobPosting, sans Playwright** ;
sans plancher = filet large, 140 offres/run → 22 cœur/24 connexe/94 cachées).
**🆕 PURGE AUTO des offres périmées** (ADR-0020) : offre non revue depuis >30 j = morte → supprimée ;
garde-fou (ne purge que si une source a réussi) ; branchée au cron + `npm run collect`.
**Base ≈ 2580 offres** (7 sources ; bouge à chaque collecte/purge).
**Pipeline pertinence + enrichissement LIVRÉ** (ADR-0011) ; **plancher de pertinence par source** (ADR-0012).
**Dashboard LIVRÉ** (ADR-0015). **🆕 TRI EN COUCHES STRICT** (ADR-0016) : signaux structurés d'abord
(ROME/catégorie Adzuna/famille AFJV/dept ATS), titre juge du cœur, **défaut strict = caché** ; fin du bruit
(usineur, SAP, cadre de santé, profs, escape-game). **🆕 CONNECTEUR ATS** (ADR-0017) : +998 offres studios
(Riot/Roblox/Epic/Scopely/Rockstar/Supercell…), dept→craft/cœur.
**Base ≈ 2408 offres** (≈ **413 cœur / 1165 connexe / 830 rejet** — bougent à chaque collecte).
Reste à faire : **automatiser la purge des offres périmées** dans le cron ; ajouter des studios/ATS ;
**dédup inter-sources** ; puis scraping (Hitmarker, The Rookies, ArtStation).
**Décision produit de cette session** : tri **STRICT** retenu par la proprio (cacher le hors-secteur net,
garder cœur 3D/jeu/VFX/anim + périphérie). **Point ouvert produit** : l'onglet **connexes est volumineux**
(corporate + ingénierie générique de studios) — à restreindre si la proprio le souhaite.

**✅ État git (reprise propre)** : tout est **commité**, arbre **propre**. Derniers commits sur `master` : `ff03a9d` (ATS) · `388231e` (tri strict) · `48a88f5` (dashboard) +
**RemoteGameJobs** + **Hitmarker & purge**. Vérifié au vert : `tsc` + `eslint` + **88 tests** (+10).
**Phase scraping OUVERTE** : `cheerio` installé (parsing HTML léger). **Playwright PAS installé**
(Hitmarker contourné via sitemap+JSON-LD ; réservé aux Cloudflare/SPA à venir : The Rookies, GameJobs.co…). Commit **local** (pas de remote configuré — pousser si un dépôt distant existe).
**Toutes les clés API sont présentes et fonctionnent.**
⚠️ **Purge périmés faite à la main** cette session (DELETE par fenêtre `recupere_le` + studios retirés) —
**à coder dans le pipeline** (sinon les offres mortes s'accumulent).
**Recensement sources : FAIT** (cf. `SOURCES.md` — liste ATS vérifiée, boards VFX, EURES écarté).
⚠️ **2 Claude travaillent en parallèle sur ce repo** (coordination via ce HANDOFF + commits).
**Direction produit actée** (2026-06-02, ADR-0009 + `PRODUIT.md`) : pertinence 3 classes (flux strict +
onglet connexes), enrichissement non filtrant, **international d'emblée → Adzuna passe AVANT FT**,
UI FR i18n-ready, **public n°1 = juniors**.
**Source de vérité du code** : le **serveur Linux** (`~/ClaraAFJV`). Le repo Windows d'origine est obsolète.

---

## 🖥️ Environnement (serveur de dev — TOUT se passe ici)

- Hôte : **`333SRV`**, Debian 13, `clara@192.168.1.175`, projet dans **`~/ClaraAFJV`**.
- **Claude Code tourne directement sur le serveur** (`~/.local/bin/claude`, v2.1.159).
- Outils : **node v20.20**, npm 10.8, git 2.47. `clara` a le **sudo sans mot de passe**.
- Lancement depuis le PC Windows : script `Lancer-ClaraAFJV.cmd` (SSH par clé, sans mot de passe).
- **Accès aux tests** : la proprio teste DEPUIS son PC Windows (même LAN). Toujours donner l'URL
  **`http://192.168.1.175:3002`** (jamais `localhost`). MCP Chrome = sur le PC Windows → viser l'IP serveur.
  Port projet = **3002** (3000/3001 pris par Lumina/Périple). `npm run dev` écoute sur `0.0.0.0:3002`.
  ufw : 3002 ouvert pour le LAN. Détails dans `CLAUDE.md` §5bis.

## 🗄️ Base de données (prête)

- **PostgreSQL 17.10 natif** (paquet Debian), cluster `main` sur le **PORT 5434**.
  ⚠️ Les ports **5432 et 5433 sont des conteneurs Docker Postgres d'AUTRES projets**
  (`postgres-333fm`, `postgres-debrid333`) — **ne pas y toucher**.
- Rôle applicatif **`hub`** / base **`hub_emploi`** (testé : connexion OK).
- Accès via `DATABASE_URL` dans `~/ClaraAFJV/.env.local` (déjà rempli).

## 🔑 Secrets — dans `~/ClaraAFJV/.env.local` (chmod 600, NON versionné)

Déjà présents : `FRANCE_TRAVAIL_CLIENT_ID`, `FRANCE_TRAVAIL_CLIENT_SECRET` (app « claraefjv »),
`DATABASE_URL` (port 5434), `CRON_SECRET`, **`ADZUNA_APP_ID` + `ADZUNA_APP_KEY`** (app « 333FM's
AppDefault », state *live*, ajoutées 2026-06-02 — ont transité par la conversation).
> ⚠️ Hygiène : les clés FT figurent dans l'historique git initial (commit de bascule) et ont transité
> par la conversation. Repo privé/auto-hébergé donc risque faible, mais **régénérer les clés FT sur
> francetravail.io** reste l'option propre si besoin (puis mettre à jour `.env.local`).

## ✅ BLOCAGE LEVÉ — France Travail opérationnel (2026-06-02)

Clés FT **régénérées** par la proprio et écrites dans `.env.local`. Vérifié en réel : OAuth **200**,
recherche **200** avec vraies offres, `npm run collect` → **214 récupérées/écrites**. L'app « claraefjv »
a désormais **toutes les API FT activées** (R&D faite, cf. mémoire `france-travail-api-maitrise`).
⚠️ Ces clés-là ont aussi transité par la conversation : si besoin de durcir, régénérer à nouveau.

## ✅ 2ᵉ source — AFJV (RSS) + plancher par source (2026-06-02, ADR-0012)

- **`src/sources/afjv/`** : connecteur RSS (`emploi.afjv.com/rss.xml`, sans clé) — `fetchOffres()` +
  `parseFlux()` (testable hors-réseau) + `normalize()`. Parse via **`fast-xml-parser`** (nouvelle dép.).
  Extrait studio/ville (description), contrat/pays (`category`), `sourceId` (lien). **88 offres**.
- **`src/pipeline/traiter.ts`** (pur, sorti de `collect.ts`) : `traiter(offre, { plancher })`. AFJV a un
  **plancher `connexe`** (board curé → jamais rejeté par le tri générique). FT : pas de plancher.
- **`collectToutes()`** = FT + AFJV, sources **isolées**. Tests : `afjv/normalize` + `traiter` → **39 verts**.
- **R&D sources** : `SOURCES.md` refait (accès vérifiés 2026-06). ArtStation = Cloudflare (Tier 4) ;
  Indeed API supprimée ; Malt = mauvais fit.

## ✅ 4ᵉ source — Games-Career (RSS) + R&D ATS publics (2026-06-02, ADR-0014)

- **`src/sources/games-career/`** : flux RSS global (`/rss/Joboffer`, sans clé). Titre « <Studio>: <Rôle> » ;
  **`content:encoded`** = desc HTML complète → helper `stripHtml()` (matière riche). Plancher `connexe`.
  **11 offres, 100 % `en`** → enrichissement bilingue **validé sur l'anglais**. Tests → **57 verts**.
- **R&D gros déblocage (à coder)** : **API publiques d'ATS** sans clé — Greenhouse (Riot=185), Lever
  (Voodoo=34), Ashby. Pertinence ~100 %. Prochain : **connecteur générique ATS** + `src/config/studios.ts`
  (liste curée slug+ATS). Cf. `SOURCES.md` Tier 1bis. APIs remote (Himalayas/Jobicy/RemoteOK) = secondaires.

## ✅ 3ᵉ source — Adzuna (API internationale) (2026-06-02, ADR-0013)

- **`src/sources/adzuna/`** : connecteur API JSON (~20 pays) au contrat habituel `fetchOffres(secteur)` +
  `normalize()` Zod → `Offre`. Accès `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` (.env.local). **Principale source hors-France.**
- **Recherche par phrases métier** : nouveau champ **`Secteur.requetesTexte`** (phrases bilingues
  « game developer », « 3D artist »… ; **distinct** de `motsCles` pour ne pas élargir FT). Boucle pays × phrases,
  dédup par `id`, **pas de plancher** (le pipeline classe). Robustesse : throttle 1200 ms, **429 → arrêt propre**,
  401/403 → erreur, autre → requête ignorée + log ; `max_days_old=31` ; pays défaut `fr/gb/us`.
- **Résultat réel** : **1053 offres** (US 395 / UK 336 / FR 322) → 201 cœur / 822 connexe / 30 hors_scope.
  La classification bilingue tient sur l'anglais. Tests connecteur Adzuna ajoutés (normalize/salaire/contrat).
- **⚠️ Point ouvert (important)** : **dédup inter-sources** non gérée (une offre peut être sur Adzuna **et**
  FT/board ; clé d'unicité actuelle = `source`+`sourceId`). Et **trou de recall** (cf. mémoire
  `recall-trou-collecte-connexe`) : collecte par filtre → patcher au plus vite via le flux Connexe.
- **🔢 Compteurs** : réconciliés dans l'en-tête (4 sources ≈ **1409** après ajout games-career). Les totaux
  bougent à chaque collecte (les flux évoluent) — ne pas s'attacher au chiffre exact.

## ✅ Pipeline pertinence + enrichissement (2026-06-02, ADR-0011)

- **Modèle** : `Offre` gagne `pertinence` (`coeur|connexe|hors_scope`) + `langue` ; schéma + migration
  `drizzle/0001_add_pertinence_langue.sql` **appliquée** ; index `(pertinence, publie_le)`.
- **Ordre pipeline** (inversé vs ancien plan) : `normalize → enrichir → classer → upsert`, composé
  par `traiter()` dans `src/pipeline/collect.ts`.
- **`src/pipeline/enrichir.ts`** (pur, bilingue, testé) : lexiques logiciels (familles : 3D/jeu=cœur,
  motion, print, CAO indus, AEC), spécialités, niveau, mode, langue. Exporte `LOGICIELS_COEUR`.
- **`src/pipeline/classer.ts`** (pur, testé) : **cœur** = soft 3D/jeu OU vocabulaire art exclusif
  (signaux cœur priment) ; **hors_scope** = bruit **dans le TITRE seulement** ; sinon **connexe**.
- **Tests** : `tests/pipeline/{enrichir,classer}.test.ts` — **28/28 verts** (tsc + eslint propres).
- **Vérifié en réel** : recollecte → 12/157/45 ; hors_scope = bruit pur (BTP, mécanique/CAO indus,
  impression 3D, escape game, FPGA, dev web) ; **aucun graphiste/infographiste/animateur rejeté**.

## ✅ Dashboard MVP (2026-06-02, ADR-0015)

- **Page `/`** (`src/app/page.tsx`) : Server Component `async`, lit `searchParams` (Promise en Next 16),
  interroge Postgres via **`src/lib/offres-repo.ts`** (Drizzle). Onglets **cœur** (défaut) / **connexes** ;
  `hors_scope` jamais montré. Tri fraîcheur (`publie_le` desc nulls last → `recupere_le`). Pagination 60/page.
- **Filtres dans l'URL** (partageable) : `vue`/`pays`/`contrat`/`experience`/`q`/`page`. Barre = `<form method=get>`
  (zéro JS client) ; helpers d'URL dans `src/lib/url.ts`. **Raccourcis juniors** (stage/alternance/junior).
- **Composants** : `src/components/{offre-carte,onglets,barre-filtres,etiquette}.tsx`. **Attribution** sur chaque
  carte (source + lien direct). **i18n-ready** : libellés dans `src/lib/i18n.ts` (locale `fr`), rien en dur. Thème sombre.
- **Route cron** `src/app/api/cron/collect/route.ts` : `GET|POST`, protégée `Authorization: Bearer $CRON_SECRET`
  → `collectToutes()`. **Vérifié réel** : 401 sans secret ; rendu OK (filtres, recherche, pagination, badges).
- ⚠️ **Faux positifs de classification vus dans le flux cœur** (à corriger côté pipeline, pas le dashboard) :
  « Substance Use Counselor » promu cœur via le logiciel *Substance* ; « Chef de projet SI » étiqueté vfx/animation.
  → renforcer les frontières de mots / ancrer le signal cœur sur le **titre** (cf. ADR-0011/0014/0015 points ouverts).
- ▶️ **Tester depuis Windows** : `http://192.168.1.175:3002` (port 3002 occupé pendant la session par un autre
  serveur — relancer `npm run dev` proprement). Note : le `npm run start` lancé en session n'a pas pu prendre 3002.

## ✅ Fait à ce jour

- **Couche données (Drizzle + pg)** : `drizzle.config.ts`, `src/db/schema.ts` (table `offres`,
  unicité `(source, source_id)`, index `publie_le`), `src/db/client.ts` (pool partagé). Migration
  `drizzle/0000_init_offres.sql` **générée et appliquée** (table vérifiée en base).
- **Type métier** `src/domain/offre.ts` (Offre + enums ModeTravail/Contrat/Experience), d'après plan §7.
- **Moteur générique (ADR-0010)** : `src/domain/secteur.ts` (type `Secteur`) + `src/config/secteur-actif.ts`
  (secteur 3D/JV = codes ROME + mots-clés). Le connecteur ne connaît pas le métier, il reçoit le `Secteur`.
- **Connecteur France Travail** `src/sources/france-travail/` **REFONDU** : `auth.ts` (OAuth2, **scope
  paramétrable** + cache par scope) + `index.ts` (`fetchOffres(secteur, opts)` par **`codeROME`** + filet
  mots-clés, pagination via `Content-Range`, plafond 1150 **journalisé**, `publieeDepuis` 31 j) + `normalize()`
  Zod (ville = `libelle` lisible). ⚠️ Champs déduits **non remplis ici** (rôle de l'enrichissement).
- **Pipeline** `src/pipeline/` : `upsert.ts` (ON CONFLICT, ne réécrit PAS les champs déduits) +
  `collect.ts` (fetch→normalize→upsert). Script `npm run collect` (tsx, `--env-file=.env.local`).
- **Tests** : Vitest (`vitest.config.ts`, alias `@/`) — `normalize.test.ts` + `fetch.test.ts`
  (`parseContentRangeTotal`, sanity config) **8/8 verts**. `tsc --noEmit` et `eslint` propres.
- **MCP Chrome validée** : depuis le PC Windows, `http://192.168.1.175:3002` charge bien l'app du serveur.

## ✅ Fait précédemment

- R&D + stack figée (ADR-0001→0008). Décisions stratégiques : scraping agressif zone grise (ADR-0007,
  ligne rouge RGPD) ; tout **auto-hébergé** sur le serveur (ADR-0003).
- Scaffold Next.js 16.2.6 migré sur le serveur (git + historique intacts), **`npm ci` + `npm run build` verts** sous Linux.
- PostgreSQL installé + base/rôle créés + `.env.local` rempli et testé.
- Docs : `CLAUDE.md`, `DECISIONS.md`, `SOURCES.md` (carte des sources R&D), `README.md`.

## ▶️ Prochaines actions (dans l'ordre — RÉORDONNÉ après tri strict + ATS)

- ~~**0. Faux positifs de classification**~~ ✅ **FAIT — tri strict en couches (ADR-0016)**.
- ~~**1. Connecteur ATS**~~ ✅ **FAIT (ADR-0017)**. — ~~**2. RemoteGameJobs**~~ ✅ **FAIT (ADR-0018)**.
- ~~**3. Hitmarker**~~ ✅ **FAIT (ADR-0019)** (sitemap+JSON-LD). — ~~**4. Purge auto périmés**~~ ✅ **FAIT (ADR-0020)**.

1. **Gains FACILES restants (R&D faite, cf. `SOURCES.md`)** — pour grossir vite la base :
   - **API remote JSON propres, sans clé** : Himalayas, Jobicy (`tag=design`), RemoteOK (attribution),
     Arbeitnow, The Muse (`category=Design and UX`). Généralistes → filtrer par tag + classifieur strict.
   - **Boards fetch+cheerio faisables** (HTML server-rendered) : **Work With Indies** (~80 offres),
     **PixelCareer** (3D/anim/VFX) ; **80 Level** = lire le JSON `__NEXT_DATA__` (Next.js, sans navigateur).
2. **Décision produit : taille de l'onglet connexes** — le restreindre (cacher le corporate de studio) ou
   le garder large ? Si on resserre : retirer le plancher `connexe` des ATS corporate, ou onglet « industrie ».
3. **Élargir les studios ATS** : ajouter des slugs à `src/config/studios.ts` (sonder GH/Lever/Ashby avant).
4. **Boards Cloudflare/SPA → installer Playwright** (gros effort, en dernier) : **The Rookies** (juniors,
   cible n°1 — mais Cloudflare + pas de sitemap d'offres), GameJobs.co, GrackleHQ, AWN, **ArtStation** (Tier 4).
5. **Dédup inter-sources** (ouvert, ADR-0013) : une même offre peut être sur Adzuna **et** FT/ATS/board.
6. **Persister `signaux` (jsonb)** pour **reclasser sans re-fetch** ; **enrichissement AFJV** (fetch détail).

## ⚠️ Pièges / à savoir

- **Next.js 16 = breaking changes** : lire `node_modules/next/dist/docs/` avant routing/API (cf. `AGENTS.md`).
- **Port DB = 5434** (pas 5432). Nom de package = `hub-emploi-3d`.
- France Travail : valider les endpoints avant de coder (connaissances potentiellement périmées).
- Playwright/cheerio : à installer seulement quand on attaque les connecteurs scrapés (Tier 3 de `SOURCES.md`).

## ❓ Décisions ouvertes

- **Résolues 2026-06-02 (ADR-0009 / `PRODUIT.md`)** : pertinence, langue/UI, périmètre international, public n°1.
- **Encore ouvertes (Phase 2)** : stockage emails d'alerte · Discord public ou webhook privé.
- **À spécifier au pipeline** : dédup **inter-sources** (même offre sur FT+Adzuna+board) ; **péremption**
  des offres mortes (pourvues/expirées) ; quelles **RSS** prioriser (Games-Career, AFJV).
