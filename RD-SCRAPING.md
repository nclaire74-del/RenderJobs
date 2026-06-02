# R&D — Boards à scraper (Tier 3) : specs clé en main

> Document de **recherche** (read-only), pas de code. Objectif : **dé-risquer** l'implémentation des
> connecteurs de boards niche (« cœur du Joker », `SOURCES.md` Tier 3) en sondant **en réel** la
> structure de chaque board → méthode d'accès, forme des données, pagination, difficulté, signaux de
> tri. Données sondées le 2026-06-02. Compagnon de `SOURCES.md` (carte) et `RD-TRI.md` (le tri).
> Rappel posture : ADR-0007 (scraping agressif offres publiques) + attribution obligatoire.

---

## 0. Tableau de bord — par où commencer

| Board | Accès machine | Difficulté | Volume vu | Statut R&D |
|---|---|---|---|---|
| **GameJobs.co** | **Flux Atom** `/?format=atom` | 🟢 trivial (fetch+parse) | **100 entrées** | ✅ spec complète §1 |
| **80 Level** (80.lv) | **`__NEXT_DATA__`** + API `_next/data` | 🟢 facile (JSON embarqué) | total **70** (10/page) | ✅ spec complète §2 |
| **Cartoon Brew Jobs** | RSS (feed dédié à confirmer) | 🟡 facile-moyen | — | §3 (1 sonde restante) |
| **ShowbizJobs** | **JSON-LD** par page | 🟡 moyen | — | §3 |
| **The Rookies** | HTML rendu (`/blog/jobs/`) | 🟡 moyen (parse HTML) | — | §3 |
| **Motionographer** | board tiers (URL à trouver) | 🟡 moyen | — | §3 |
| **Hitmarker** | **Craft+Sprig** → fragment HTML (endpoint `sprig-core/render`) | 🔴 moyenne (config signée) | — | §4 — recette détaillée |
| **Work With Indies** | SPA, source de données cachée | 🔴 dur (navigateur requis) | — | §4 |

**Constat dé-risquant** : la majorité des boards exposent des **données structurées** (flux, JSON
embarqué, JSON-LD) → scrapables en **fetch + parse**, **sans Playwright**. Playwright n'est nécessaire
que pour les 2 SPA hostiles (Hitmarker, WWI). Commencer par GameJobs.co + 80.lv (gain immédiat).

---

## 1. GameJobs.co — 🟢 TRIVIAL (flux Atom)

- **Endpoint** : `https://gamejobs.co/?format=atom` (site type Squarespace ; **pas** de `__NEXT_DATA__`,
  contrairement à une note antérieure de `SOURCES.md` — corrigé ici).
- **Contenu** : **100 `<entry>`** (offres récentes). Champs par entrée : `title` (souvent « <Rôle> at
  <Studio> »), `link` (URL canonique de l'offre), `updated`/`published`, `category`.
- **Mapping `Offre`** : `titre` = title (séparer « at » → studio) ; `url` = link ; `publieLe` = updated ;
  `sourceId` = slug de l'URL. `description` = à enrichir via la page détail si besoin (sinon court).
- **Tri** : board 100 % game dev → **plancher `connexe`** (curé), `category` Atom = indice spécialité.
- **Implémentation** : `fetch` + `fast-xml-parser` (déjà dépendance), même patron qu'AFJV. ~1 h.

## 2. 80 Level (80.lv/jobs) — 🟢 FACILE (JSON embarqué)

- **Accès** : la page `https://80.lv/jobs` embarque `<script id="__NEXT_DATA__">` → JSON.
  Chemin de la liste : **`props.initialState.jobBoard.data.jobs`** = `{ total: 70, items: [10] }`.
- **API propre (pagination)** : `https://80.lv/_next/data/{buildId}/jobs.json?page=N` (le `buildId` est
  dans `__NEXT_DATA__.buildId` — ⚠️ change à chaque déploiement : le lire dynamiquement depuis la page).
  10 offres/page, **total ~70** → ~7 pages.
- **Champs par offre** (riches) : `id`, `slug`, `title`(preview), `company` (objet : `title`, `website`,
  `logo`), `city`, `country`, `job_type` (« On-site »/« Remote » → **`modeTravail`**), `categories[]`
  (ex. « Illustration », « 3D Modeling » → **spécialité + signal tri**), `date`, `description`/`preview`, `image`.
- **Mapping `Offre`** : `titre`=title, `studio`=company.title, `ville`=city, `pays`=country (EN→map),
  `url`=`https://80.lv/jobs/{slug}` (à confirmer), `modeTravail`=job_type, `publieLe`=date.
- **Tri** : 80.lv = **CG/art au sens large** (pas que jeu vidéo : illustration, ciné, pub) → **PAS de
  plancher cœur** ; laisser le classifieur trancher via `categories[]` + titre. Densité niche moyenne.
- **Implémentation** : `fetch` page → extraire `__NEXT_DATA__` (regex `id="__NEXT_DATA__"`) → lire
  `buildId` → boucler `_next/data/{buildId}/jobs.json?page=N`. ~2-3 h.

## 3. Boards 🟡 moyens — 1 sonde restante chacun

- **Cartoon Brew Jobs** : page `/jobs` a un lien RSS, mais le feed trouvé (`cartoonbrew.com/feed`) est le
  **blog**, pas les offres. → **À faire** : trouver le feed *jobs* (probablement `jobs.cartoonbrew.com`
  ou une catégorie WP type `/jobs/feed/`). JSON-LD aussi présent sur la page. Anim/cartoon → bon fit niche.
- **ShowbizJobs** : **JSON-LD** par page (serveur IIS). → parser le JSON-LD `JobPosting` ; vérifier la
  pagination (querystring). Secteur ciné/TV/anim → connexe/cœur selon rôle.
- **The Rookies** (`therookies.co/blog/jobs/`) : **HTML rendu** (Cloudflare, pas de JSON embarqué détecté).
  → parser les cartes d'offres en HTML (cheerio) ; **cible n°1 juniors** (priorité produit). Vérifier pagination.
- **Motionographer** : l'URL `/jobs/` redirige vers un vieux billet → le board emploi est ailleurs
  (probablement un board tiers type Authentic Jobs/embed). → **À faire** : localiser l'URL réelle du board.

## 4. Boards 🔴 durs — SPA, navigateur requis

- **Hitmarker** (hitmarker.net/jobs) : **le plus gros board gaming/esport** (priorité volume). **Stack
  identifié (R&D 2026-06-02)** : **Craft CMS + Sprig** (réactivité HTMX) — indices : `htmx.min.js`,
  `cpresources/` (Craft), bundle `dist/jobs-*.js`. La page ne rend PAS la liste côté serveur (8 liens
  seulement) : la liste d'offres est un **composant Sprig** chargé au `load` via :
  - `data-hx-get="https://hitmarker.net/index.php/actions/sprig-core/components/render"`
  - `data-hx-trigger="load, refresh"`, `data-hx-target="this"`, **`data-hx-include="this"`**
  - `data-hx-vals='{"sprig:siteId":"55d1ccef…","sprig:id":"4fc52ac8…","sprig:component":"…","sprig:config":"…(signé)"}'`
  
  La **réponse est un fragment HTML** (cartes d'offres) → parse cheerio, **pas du JSON**. ⚠️ Un GET « nu »
  avec seulement `hx-vals` revient **vide** : `hx-include="this"` impose d'envoyer **aussi les `<input>`
  cachés du composant** (dont `sprig:config` **signé** + `sprig:id`). **Recette pour le connecteur** :
  (1) GET `/jobs`, (2) isoler le `<div>` du composant résultats, (3) collecter `hx-vals` **+ tous les
  `name/value` des inputs internes**, (4) rejouer le GET `render` avec l'ensemble + header `HX-Request: true`
  (+ une var de page/offset pour paginer), (5) parser le fragment HTML. **Finalisation conseillée** :
  une **capture réseau au navigateur** (MCP Chrome `read_network_requests` sur la requête `load`) donne la
  liste exacte des params en 1 coup — plus rapide que de réextraire les inputs à l'aveugle. Difficulté 🔴
  moyenne (pas de JSON propre + config signée), mais **mécanisme désormais connu, plus une inconnue**.
- **Work With Indies** (workwithindies.com) : SPA, `/jobs` et `/api/jobs` en **404**, JSON-LD homepage =
  `WebSite`/`Organization` seulement. Source de données cachée (Airtable/Notion/embed probable). **Approche** :
  même méthode navigateur (observer le réseau) pour trouver d'où viennent les offres. Une **option RSS** est
  évoquée dans `SOURCES.md` — à revérifier (l'URL `/jobs.rss` testée = 404).

> ⚠️ **ArtStation** (cible explicite proprio) est **Tier 4 hostile** (Cloudflare) et mérite sa **propre
> R&D** (endpoint JSON `?json` historique, niveau de protection, infra proxy). Hors périmètre de ce doc.

---

## 5. Recommandation d'implémentation (ordre)

1. **GameJobs.co** (Atom) — 🟢 gain immédiat, ~1 h, patron AFJV.
2. **80 Level** (`__NEXT_DATA__` + `_next/data`) — 🟢 ~2-3 h, données riches.
3. **The Rookies** (HTML) — 🟡 **priorité produit (juniors)**.
4. **ShowbizJobs / Cartoon Brew** (JSON-LD / RSS) — 🟡 après une dernière sonde de feed.
5. **Hitmarker** (Craft+Sprig, recette §4) — 🔴 **gros volume**, mécanisme connu ; finaliser par une
   capture réseau navigateur (params signés) puis rejouer `sprig-core/render` + parse HTML.
6. **Work With Indies** — 🔴 idem (découverte réseau d'abord).

**Signaux de tri exposés** (à brancher dans `classer` via le sac `signaux`, cf. `RD-TRI.md`) : `category`
(GameJobs.co Atom), `categories[]` + `job_type` (80.lv). Les boards curés 100 % jeu (GameJobs.co) →
plancher `connexe` ; les boards larges (80.lv, ShowbizJobs) → pas de plancher, le titre tranche le cœur.

## 6. À retenir

La plupart des boards Tier 3 sont **scrapables sans Playwright** grâce à des **données structurées
embarquées** (Atom, `__NEXT_DATA__`, JSON-LD) → implémentation rapide façon connecteur. **Hitmarker**
(Craft+Sprig → fragment HTML via `sprig-core/render`, mécanisme désormais cartographié, recette §4) et
**Work With Indies** (SPA, source à localiser) demandent une **capture réseau au navigateur** pour
finaliser les params — pas un blocage, juste une dernière sonde.
