# R&D — ArtStation Jobs (Tier 4 hostile) : faisabilité & recette

> Cible **explicite de la proprio**. Board art n°1 (jeu vidéo + ciné/VFX) → très haute densité « cœur ».
> Document de **recherche** (read-only), pas de code. Sondé en réel le 2026-06-02. Posture : ADR-0007
> (scraping agressif offres publiques, attribution obligatoire) — ArtStation = **Tier 4 (hostile)** de
> `SOURCES.md` : Cloudflare + CSRF. **Verdict : faisable, API entièrement cartographiée, un seul verrou
> (le token CSRF, qui exige un navigateur pour passer le challenge Cloudflare).**

---

## 1. Carte de la protection (résultats réels)

| Cible | Résultat | Lecture |
|---|---|---|
| `GET /jobs` (page HTML) | **403 + `cf-mitigated: challenge`** | **Challenge JS Cloudflare** sur les pages HTML |
| `GET /jobs.json` (shell SPA) | 200 (HTML shell Angular) | passe, mais ne contient pas les offres |
| `GET /api/v2/jobs/search.json` | **500** (erreur Rails origine) | **l'endpoint existe, atteint l'origine** (pas bloqué par CF !) |
| `POST /api/v2/jobs/search.json` (body JSON, sans token) | **412 « Invalid CSRF Token »** | shape acceptée ; **seul le token manque** |

**Constat majeur** : les endpoints **`/api/v2/*` ne sont PAS soumis au challenge JS** (ils atteignent
l'origine Rails) — contrairement aux pages HTML. Le seul obstacle à l'API est le **token CSRF public**.

## 2. L'API jobs (entièrement identifiée)

- **Endpoint** : `POST https://www.artstation.com/api/v2/jobs/search.json`
- **Body JSON** : `{"page":1,"per_page":10,"sorting":"recent", …filtres}` (la shape `page/per_page` est
  acceptée — c'est le CSRF qui bloque, pas le body).
- **Header requis** : **`Public-Csrf-Token: <token>`** (confirmé : le JS référence `PublicCsrfToken` /
  `public-csrf-token` ; sans lui → **412**).
- **Cookies** : `__cf_bm` (Cloudflare bot-management, ~30 min) ; un cookie/`Public-Csrf-Token` est
  provisionné **après passage du challenge**.
- **Routes front Angular vues dans le bundle** : `/jobs/all` (liste), `/jobs/studios`, `/jobs/saved`,
  `/jobs/job_preferences`, `/jobs/job_resources`. Stack = Rails + SPA Angular (`data-beasties-container`).

## 3. Le verrou : obtenir le `Public-Csrf-Token`

Le token **n'est pas ambiant** : un `GET` d'amorçage ne pose que `__cf_bm` (pas de cookie CSRF), et
`/api/v2/csrf_protection/token.json` → 404 (`UnknownFormat`). Le token est provisionné **dans le contexte
d'une page ayant passé le challenge JS Cloudflare**. ⇒ **Il faut un navigateur** (ou un solveur de
challenge) pour : (1) passer le challenge CF, (2) récupérer `cf_clearance` + `Public-Csrf-Token`.

## 3bis. Confirmation navigateur en réel (MCP Chrome, 2026-06-02)

Capture menée via le navigateur (qui passe Cloudflare naturellement). **Résultats VÉRIFIÉS** :
- ✅ Le navigateur **passe Cloudflare** sans friction → la page `/jobs` rend de vraies offres.
- ✅ **Le token CSRF est dans `<meta name="public-csrf-token" content="…">`** (provisionné une fois CF
  passé ; ex. capturé : `tX1Vu5bC…==`). C'est LÀ qu'il faut le lire (pas un cookie, pas `csrf-token`).
- ✅ **Le token est accepté par l'API** : un `POST /api/v2/jobs/search.json` **sans** token → **412**
  « Invalid CSRF Token » ; **avec** le token du meta → **500** (plus de 412 → le token passe, c'est le
  **corps de requête** qui est en cause). La chaîne « meta token → API » est donc **validée**.
- ⚠️ **Schéma du body non figé** : variantes testées (`{page,per_page}`, `{filters:[]}`, `{query}`,
  GET avec query string…) → toutes **500**. L'app **ne déclenche pas** l'appel sur un simple chargement
  /scroll (résultats **rendus côté serveur**) → impossible de capturer son payload exact sans **actionner
  une vraie interaction UI** (clic sur un filtre, page suivante, soumission de recherche).
- ℹ️ Voie alternative repérée : la liste est **SSR** ; un connecteur navigateur pourrait **parser le DOM
  rendu** (cartes d'offres) plutôt que l'API — à confirmer sur la vue liste complète (la vue `?q=` testée
  était trop pauvre en DOM).

**Reste exactement 1 inconnue** : le **schéma JSON du body** de `search.json`. Se capture en 1 geste en
actionnant un filtre/pagination dans l'UI avec l'intercepteur `fetch`/`XHR` déjà prêt (cf. §5).

## 4. Recette recommandée (pour le futur connecteur)

1. **Établir une session via navigateur** : Playwright (Chromium) **ou** MCP Chrome (PC Windows, qui passe
   le challenge naturellement) **ou** un solveur type FlareSolverr. Naviguer sur `https://www.artstation.com/jobs`,
   laisser CF se résoudre, puis **capturer** depuis les requêtes réseau : le header **`Public-Csrf-Token`**
   et les cookies (`cf_clearance`, `__cf_bm`).
2. **Rejouer l'API JSON en direct** (léger, rapide) : `POST /api/v2/jobs/search.json` avec le token + cookies,
   en paginant via `{page:N}`. Tant que les cookies sont valides (`__cf_bm` ~30 min), pas besoin du navigateur →
   on ne paie le coût navigateur qu'au **renouvellement de session**.
3. **À l'échelle** : **proxies résidentiels/rotatifs** probablement nécessaires (CF rate-limite par IP) →
   cohérent avec « Tier 4, infra proxy requise » (`SOURCES.md`). Throttle + backoff sur 403/429.

## 5. Prochaine sonde (1 étape, fait sauter le dernier inconnu)

**Capturer un token réel + une réponse `search.json` via MCP Chrome** (le navigateur de la proprio passe CF
sans effort) : naviguer sur `/jobs`, lire les requêtes réseau (`read_network_requests`) pour relever le header
`Public-Csrf-Token` et le JSON de réponse → on confirmera alors **les champs exacts d'une offre** (titre,
studio, discipline/catégorie, remote, localisation, date) et les **filtres** disponibles (discipline,
type de contrat…). Ces champs seront d'excellents **signaux de tri** (board art → densité cœur très élevée).
*Je peux faire cette capture si le navigateur est connecté côté PC Windows.*

## 6. Verdict

ArtStation est **faisable et la recette est validée en réel** : navigateur passe Cloudflare → token lu dans
`<meta name="public-csrf-token">` → **token accepté** par `POST /api/v2/jobs/search.json` (412 sans → 500 avec).
C'est un connecteur **« session navigateur → API JSON »** (ou, en alternative, **parse du DOM SSR**), à brancher
quand l'infra proxy est prête. **Une seule inconnue résiduelle** : le **schéma exact du body** de `search.json`,
à capturer en actionnant un filtre/pagination dans l'UI (intercepteur `fetch`/`XHR` déjà en place). Effort
restant minime ; plus aucun point bloquant de principe.
