# R&D — Welcome to the Jungle (canal FR **requis**) : architecture & recette

> **Statut : source REQUISE** (demande proprio — « il le faudra quoi qu'il arrive »). Canal FR majeur
> (studios/éditeurs/startups). R&D approfondie via navigateur le 2026-06-02. **Architecture entièrement
> cartographiée** ; le connecteur passera par **Playwright** (les *listings* sont gardés côté serveur).
> Document de recherche, read-only. Compagnon de `RD-SOURCES-FR.md`.

---

## 1. Ce qui est ÉTABLI (sondé en réel)

**a) Annuaire des sociétés — API ouverte** 🟢
`GET https://api.welcometothejungle.com/api/v1/organizations` → 200, sans auth. Champs : `slug`,
`name`, **`jobs_count`**, `sectors`, `offices`, `nb_employees`. → utile pour **cibler des studios** et comme **signal**.

**b) Algolia (appId `csekhvms53`)** — **pas pour les offres** ⚪
Utilisé uniquement par les widgets « sociétés » et « articles » (`wk_cms_organizations_production`,
`wk_cms_articles_production`). **Aucun index jobs** (25 bundles scannés). → impasse pour les offres.

**c) API jobs interne `/api/v3/search/jobs`** — partiellement ouverte 🟠
- `GET https://api.welcometothejungle.com/api/v3/search/jobs/count?job_title=…` → **200** avec auth
  (donne `{total}`). **Rejouable** (confirmé in-page). → bon pour les **volumes/signaux**.
- `GET https://api.welcometothejungle.com/api/v3/search/jobs?job_title=…&page=&per_page=` (les **listings**)
  → **403 Forbidden** *même avec le token valide qui marche pour `/count`*. ⇒ **listings gardés côté
  serveur** (SSR), pas exposés à l'API client.
- **Auth** : header **`x-csrf-token`** (valeur dans le **cookie `csrf-token`**, 56 chars) + `wttj-user-language: fr`.

**d) Protections** : fetch serveur « nu » → **shell anti-bot** (pas le vrai contenu) ; **bannière cookies
Axeptio** (RGPD) à l'arrivée → cliquer **« Non merci »** (option respectueuse de la vie privée). La page
`/fr/jobs?query=…` est un **écran de recherche-landing** : les résultats n'apparaissent qu'**après avoir
soumis** une recherche (bouton « Rechercher »).

## 2. Recette recommandée pour le connecteur (Playwright)

Puisque les listings sont SSR et l'API listing fermée au client, le connecteur **rend la page** :
1. **Playwright** (Chromium) → naviguer sur `https://www.welcometothejungle.com/fr/jobs`.
2. **Décliner les cookies** (« Non merci » — bannière Axeptio).
3. **Soumettre une recherche** par mot-clé/métier (`job_title`) — ex. par phrase de `Secteur.requetesTexte`.
4. **Attendre le rendu** des résultats puis **parser les cartes d'offres du DOM** : titre, société, lieu,
   type de contrat, lien `…/fr/companies/{org}/jobs/{slug}`. **Paginer** via l'UI (scroll/bouton).
5. Rafraîchir la session quand les cookies expirent.

**Compléments sans Playwright** (utiles tout de suite si besoin) : `/api/v1/organizations` (annuaire +
`jobs_count`) et `/api/v3/search/jobs/count` (volumes par mot-clé) sont **ouverts/rejouables** → on peut
déjà mesurer la couverture WTTJ et cibler des sociétés, sans encore extraire les offres.

## 3. Effort, légitimité, pré-requis

- **Effort : moyen-élevé** (Playwright + parse DOM + gestion consentement/pagination). L'infra Playwright
  servira **aussi** Hitmarker et d'autres SPA → mutualiser.
- **Légitimité** : offres publiques d'entreprises (pas de données perso → hors ligne rouge RGPD du projet) ;
  on décline les cookies non essentiels ; **attribution** (lien vers la fiche WTTJ). ⚠️ **Vérifier le
  `robots.txt` de WTTJ sur `/fr/jobs` avant la prod** (non vérifié ici) — si Disallow, rebasculer en posture
  ADR-0007 (décision proprio), comme pour les autres boards.

## 4. Verdict

WTTJ est **faisable et entièrement cartographié**, mais ce n'est **pas une API ouverte d'offres** : les
listings exigent un **rendu navigateur (Playwright)**. À brancher **quand l'infra Playwright sera en place**
(mutualisée avec Hitmarker). En attendant, l'**annuaire** + le **/count** (ouverts) permettent déjà de
mesurer/cibler. **Source requise → planifier**, pas un quick win.
