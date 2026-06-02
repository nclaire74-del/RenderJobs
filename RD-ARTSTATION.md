# R&D — ArtStation Jobs : API publique JSON (cracké, sans auth)

> Cible **explicite de la proprio**. Board art n°1 (jeu vidéo + ciné/VFX). Sondé en réel le 2026-06-02
> (analyse réseau via MCP Chrome + confirmation serveur). **VERDICT : trivial.** Contrairement à la crainte
> initiale (« Tier 4 hostile, Cloudflare, proxy requis »), l'**API JSON des offres est PUBLIQUE et ouverte** :
> un simple `GET` **sans auth, sans CSRF, sans navigateur, sans cookie** suffit. Seules les **pages HTML**
> sont protégées par le challenge Cloudflare — pas l'API. → ArtStation est en réalité une source **Tier 1**.

---

## 1. La spec (clé en main, confirmée)

- **Endpoint liste/recherche** : `GET https://www.artstation.com/api/v2/jobs/public/jobs.json`
- **Params (query string)** : `page`, **`per_page` (OBLIGATOIRE, min 3)**, `query` (texte libre). Ex.
  `?page=1&per_page=50&query=` — `per_page` absent → 400 « should be given » ; `per_page=1/2` → 400 « >= 3 ».
  Vérifié 2026-06-02 : `per_page` 5/50/100 → 200.
- **Auth** : **AUCUNE**. Pas de CSRF, pas de cookie, pas de challenge sur ce chemin. Confirmé **côté serveur**
  (fetch Python, UA navigateur banal) → **200** + JSON complet. Le segment **`/public/`** est la clé.
- **Réponse** : `{ "total_count": 90, "data": [ {offre}, … ] }`. Le board entier ≈ **90 offres ouvertes**
  (petit mais **100 % art/jeu/ciné → densité « cœur » très élevée**, exactement la niche).
- **Endpoints compagnons** : `…/public/jobs/facets.json` (filtres/facettes) · `…/public/jobs/{hash_id}.json` (détail).

## 2. Champs d'une offre (riches, directement exploitables pour le tri)

`id`, **`hash_id`** (→ `sourceId` + URL `https://www.artstation.com/jobs/{hash_id}`), `title`, `description`,
**`skills`** (signal spécialité/tri), **`level`** (`junior`/`middle`/`senior`… → **`experience`** sans regex !),
**`job_type`** (`permanent`… → **`contrat`**), **`work_remotely`** (booléen → **`modeTravail`**), `offer_relocation`,
**`company_name`** (→ `studio`), `company_url`, `apply_link` (souvent vide → repli sur l'URL ArtStation du poste),
**`salary_range`** (objet structuré `{min_salary, max_salary, currency, period, currency_symbol}`),
**`recruitment_localities`** (tableau de localités `{locality:{continent_name, country…}}` → **ville/pays**),
`created_at`/`updated_at` (→ `publieLe`), `featured`, `image_thumb_url`, `recruitment_company`.

**Mapping `Offre`** quasi 1-pour-1 ; et **`level` + `work_remotely` + `job_type` + `skills`** sont des signaux
**structurés** parfaits pour le tri (cf. `RD-TRI.md`) — pas besoin d'heuristiques de texte. Board curé art/jeu
→ **plancher `connexe`**, `coeur` via titre/skills.

## 3. Recette connecteur (très simple)

1. Boucler `GET …/public/jobs.json?page=N&per_page=50` jusqu'à couvrir `total_count` (~2 pages pour 90 offres).
2. `normalize()` : mapping direct des champs ci-dessus (`hash_id`→url, `company_name`→studio, `level`→experience,
   `work_remotely`→modeTravail, `job_type`→contrat, `salary_range`→salaire, `recruitment_localities`→ville/pays).
3. **Pas d'infra spéciale** : fetch standard (comme Adzuna/France Travail). Throttle léger + UA navigateur poli.
   Attribution = lien vers la fiche ArtStation. Surveiller un éventuel durcissement CF (improbable sur `/public/`).

## 4. Chemin de R&D (pour mémoire — fausses pistes écartées)

- Les **pages HTML** (`/jobs`) renvoient **403 + `cf-mitigated: challenge`** (challenge JS Cloudflare) → c'est
  ce qui faisait croire à une cible hostile. Mais les endpoints **`/api/v2/*` atteignent l'origine** sans challenge.
- Fausse piste initiale : `POST /api/v2/jobs/search.json` + header `Public-Csrf-Token` (lu dans
  `<meta name="public-csrf-token">`). Le token est **accepté** (412 sans → 500 avec) mais l'endpoint **n'est pas
  le bon** (500 quel que soit le body). La **capture réseau** (interception `fetch`/`XHR` + recherche réelle dans
  l'UI) a révélé le **vrai** endpoint : `GET …/public/jobs.json` — **ouvert, sans CSRF**.
- Leçon : pour ce type de SPA, **capturer la requête réelle au navigateur** tranche en quelques minutes ce que
  le devinage d'API laisse en 500.

## 5. Verdict

ArtStation = **résolu et facile**. `GET https://www.artstation.com/api/v2/jobs/public/jobs.json?page=N&per_page=50`
→ JSON public, **sans auth**, ~90 offres ultra-pertinentes (art/jeu/ciné), champs structurés idéaux pour le tri.
**Reclasser de Tier 4 (hostile) vers Tier 1** dans `SOURCES.md`. Connecteur au même patron qu'Adzuna/FT — **aucune
infra navigateur/proxy nécessaire**. Plus aucune inconnue.
