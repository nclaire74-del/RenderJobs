# HANDOFF — Point de reprise

> À lire en premier au démarrage d'une session (avec `CLAUDE.md` + `DECISIONS.md`).
> Mis à jour avant chaque `/clear`. Format court et opérationnel.

**Dernière mise à jour** : 2026-06-02 (session : Games-Career + R&D ATS + **recensement sources + checkpoint git**)
**Phase en cours** : Phase 0 → Phase 1. **4 sources vivantes** : **France Travail** (API, ROME) +
**AFJV** (RSS, jeu vidéo FR) + **Adzuna** (API, ~20 pays) + **Games-Career** (RSS, jeu vidéo EU/EN).
**Pipeline pertinence + enrichissement LIVRÉ** (ADR-0011) ; **plancher de pertinence par source** (ADR-0012).
Base ≈ **1409 offres** (FT 215 / AFJV 89 / Adzuna 1094 / Games-Career 11 ; compteurs ±, les flux bougent).
Reste à faire : **dashboard** (flux cœur + onglet connexes), **connecteur générique ATS** (Greenhouse/Lever/
Ashby — liste-amorce ~24 studios vérifiée, `SOURCES.md` Tier 1bis), puis scraping (Hitmarker, The Rookies, ArtStation).

**✅ État git (reprise propre)** : tout est **commité**, arbre **propre**. Derniers commits sur `master` :
`12bed44` (recensement sources) · `fc6dc85` (checkpoint : pipeline + 4 connecteurs). Vérifié au vert avant
checkpoint : `tsc` + `eslint` + **57 tests** + `npm run build`. Commit **local** (pas de remote configuré
à ma connaissance — pousser si un dépôt distant existe). **Toutes les clés API sont présentes et fonctionnent.**
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

## ▶️ Prochaines actions (dans l'ordre — RÉORDONNÉ par ADR-0009)

1. **Dashboard (Phase 1, priorité haute)** : lire `offres` — **flux `coeur`** (tri `publie_le` desc,
   fallback `recupere_le`) + **onglet « connexes »** ; `hors_scope` masqué. Carte d'offre avec
   **attribution** (source + lien). **Filtre pays** + défauts juniors (mise en avant stage/alternance/
   junior). Afficher les étiquettes enrichies (logiciels/spécialités/niveau). UI **i18n-ready**.
   Route API `/api/cron/collect` protégée par `CRON_SECRET`. ⚠️ **Lire `node_modules/next/dist/docs/`
   avant** (Next 16 breaking changes).
   - ~~`pertinence`/`langue` au modèle~~ ✅ **FAIT (ADR-0011)**. ~~Classifieur + enrichissement~~ ✅ **FAIT**.
2. **Connecteur générique ATS** (🟢 sans clé, ~100 % pertinent — **gros déblocage R&D ADR-0014**) :
   Greenhouse/Lever/Ashby exposent les offres par studio. Bâtir 1 connecteur générique + `src/config/studios.ts`.
   **Liste-amorce de ~24 studios VÉRIFIÉE en réel (2026-06-02)** dans `SOURCES.md` Tier 1bis (Roblox 252,
   Scopely 202, Riot 185, Epic 124, Rockstar 79, Supercell 46, Voodoo 123, thatgamecompany 25…). Greenhouse
   `?content=true` = desc riche. Plancher `connexe`. **VFX/anim pas sur ATS → via boards Tier 3.**
3. **APIs remote gratuites** (secondaire) : Himalayas/Jobicy/RemoteOK (sans auth, EN) — filtrage niche requis.
4. **Scraping boards niche** (gros volume, cœur du « Joker ») : installer **Playwright**, attaquer
   **Hitmarker** / **GameJobs.co** / **The Rookies** (juniors). **ArtStation = Cloudflare → en dernier**.
5. **Élargir le recall FT** : ajouter des `codesRome`/`motsCles` dans `src/config/secteur-actif.ts` —
   le tri `connexe`/`hors_scope` absorbe le bruit **sans perdre d'offre** (à faire après le dashboard).
6. **Améliorer l'enrichissement AFJV** : description RSS courte (~80 car.) → fetch optionnel de la page
   de détail par offre pour de meilleures étiquettes (cf. ADR-0012). (Games-Career ✅ a déjà la desc complète.)
7. **Dédup inter-sources** (ouvert, ADR-0013) : une même offre peut être sur Adzuna **et** FT/board.

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
