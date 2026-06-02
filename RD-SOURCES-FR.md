# R&D — D'où viennent les offres JV en France ? (cartographie & faisabilité)

> Question proprio : **où naissent réellement les offres jeu vidéo en France** (puis ailleurs) ?
> Document de **recherche**, read-only, sondé le 2026-06-02 (web + tests d'accès réels). But : vérifier
> qu'on capte les **bons canaux**, repérer les gaps, et juger la faisabilité d'accès de chacun.

---

## 0. Réponse en une phrase

En France, les offres JV viennent surtout de **4 robinets** : (1) **les studios eux-mêmes** (pages
carrières/ATS) ; (2) **AFJV**, le board spécialisé qui **centralise déjà** l'écosystème (SNJV, Capital
Games, clusters) ; (3) **France Travail** (institutionnel) ; (4) **Welcome to the Jungle** (scène
studios/startups). **Bonne nouvelle : on capte déjà 2 des 3 plus gros agrégateurs (AFJV + France Travail).**

## 1. Ce qu'on couvre DÉJÀ (et c'est l'essentiel du volume FR)

- ✅ **AFJV** (`emploi.afjv.com`, branché) — **LE** board FR jeu vidéo. Il **agrège** les offres de **SNJV**
  (syndicat), **Capital Games** (cluster Île-de-France), et d'autres → en l'ayant, on récupère déjà une
  grande partie de l'écosystème **spécialisé** FR sans multiplier les connecteurs. Densité cœur la plus forte.
- ✅ **France Travail** (API, branché) — couvre l'**institutionnel** FR (toutes tailles, alternance/stage).
- ✅ **Games-Career** (EU/EN, branché), **Adzuna** (FR+monde, branché), **ATS studios** (Voodoo…), **Hitmarker**.

→ Le « tronc » FR est donc **déjà en place**. Les gains restants sont des **compléments ciblés**, pas un trou béant.

## 2. Studios FR en direct (origine n°1) — carte ATS réelle

Sondage ATS publics (2026-06-02). **Présents (à ajouter à `studios.ts`)** :

| Studio | ATS | Offres | Note |
|---|---|---|---|
| **Amplitude Studios** | Greenhouse (`amplitude`) | 53 | Paris (Sega) — **gros volume**, à ajouter en priorité |
| **Gameloft** | SmartRecruiters (`Gameloft`) | 79 | nécessite le support **SmartRecruiters** (cf. RD-VALIDATION) |
| **Don't Nod** | SmartRecruiters (`Dontnod`) | 5 | Paris |
| **Focus Entertainment** | Ashby (`focus`) | 3 | éditeur Paris |
| **Voodoo** | Lever/Ashby | déjà en config | mobile, Paris |

**Absents des ATS publics** (Ubisoft, Sloclap, Shiro Games, Sandfall, Ankama, Quantic Dream, Asobo,
Cyanide, Spiders, Microids, Nacon…) : ils sont sur **Workday / leur site propre / SmartRecruiters régional**
→ pas d'API publique simple. **Mais** leurs offres remontent largement via **AFJV / France Travail / WTTJ**,
donc pas de perte critique. (Couverture directe = R&D « découverte de slugs » à l'échelle, cf. `ats-coverage-studios`.)

## 3. Nouveaux canaux FR à brancher (par faisabilité)

- 🟡 **Welcome to the Jungle** — **canal FR majeur** (beaucoup de studios/éditeurs y publient). **API publique
  ouverte** confirmée : `GET https://api.welcometothejungle.com/api/v1/organizations` (200, annuaire avec
  `slug`, `jobs_count`, `sectors`, `offices`). ⚠️ Les **offres** ne sont pas sur cet endpoint (sous-chemins
  `/jobs` → 404) : elles passent par un **index Algolia** (clés `appId`+search-key à extraire du bundle JS,
  même méthode qu'ArtStation/Hitmarker). **Faisable et légitime** (API publique, clés Algolia client) →
  **prochaine sonde dédiée** : récupérer les clés Algolia + l'index jobs. Fort potentiel FR.
- 🟡 **Gaming Campus / `fr.jobs.game`** — board FR jeu vidéo + esport. `wp-json` **désactivé** (404) → pas
  d'API REST ; mais **JSON-LD `JobPosting`** présent sur les pages → scraping via JSON-LD/HTML (effort moyen).
- ⚪ **Apec** (cadres) : généraliste, JV minoritaire et redondant → basse priorité.

## 4. Institutionnel / clusters / écoles (déjà relayés, peu d'action directe)

- **SNJV**, **Capital Games** (IDF), **Atlangames** (Ouest), **Bordeaux Games**, hubs Lyon/Lille/Marseille :
  **relaient via AFJV** → déjà captés indirectement. Pas de connecteur dédié nécessaire à court terme.
- **Écoles** (ENJMIN, Rubika, ISART, Gobelins, Supinfogame) : job boards pour **juniors/alternance** (public
  n°1 du produit, ADR-0009) → piste **plus tard** pour la cible junior (souvent accès réservé/portail).
- **AFJV Observatoire** (`emploi.afjv.com/observatoire`) : **données marché** (répartition régionale de l'emploi
  JV) → matière pour une future **feature data**, pas une source d'offres.

## 5. Récap & reco (priorisée)

| Canal | Statut | Action | Effort |
|---|---|---|---|
| AFJV, France Travail, Games-Career, Adzuna | ✅ branché | — | — |
| **Amplitude (gh) + Don't Nod/Gameloft (SR) + Focus (ashby)** | à brancher | ajouter à `studios.ts` (+ support **SmartRecruiters**) | faible |
| **Welcome to the Jungle** | API ouverte, jobs via Algolia | **sonde Algolia** puis connecteur | moyen |
| Gaming Campus (`fr.jobs.game`) | JSON-LD | connecteur scraping léger | moyen |
| Clusters/SNJV/écoles | relayés via AFJV | rien (sauf écoles plus tard pour juniors) | — |
| LinkedIn/Indeed | interdit (cf. `RD-LINKEDIN.md`) | soumission communautaire only | — |

**Ordre conseillé** : (1) **Amplitude + Focus + Don't Nod** dans `studios.ts` (gain immédiat, FR, cœur),
en ajoutant **SmartRecruiters** au connecteur ATS ; (2) **Welcome to the Jungle** (sonde Algolia → connecteur) ;
(3) Gaming Campus. Les studios FR hors-ATS sont déjà couverts via AFJV/FT/WTTJ.

## 6. Et ailleurs (après la France)

Le modèle FR se généralise : **ailleurs = ATS studios internationaux** (Greenhouse/Lever/Ashby/SmartRecruiters,
déjà branchés + à élargir) **+ Adzuna** (multi-pays) **+ Games-Career** (EU) **+ Hitmarker** (mondial) **+
ArtStation** (mondial art, cf. `RD-ARTSTATION.md`). Les équivalents nationaux de WTTJ existent (ex. boards
DE/UK/US) mais l'écosystème ATS+Adzuna couvre déjà l'international ; à raffiner par pays selon la demande.

## 7. Verdict

On capte **déjà le tronc des offres JV France** (AFJV centralise le spécialisé + France Travail l'institutionnel).
Les gains restants sont **ciblés et faisables** : 3 studios FR sur ATS (Amplitude/Don't Nod/Focus), **Welcome to
the Jungle** (API ouverte + Algolia), Gaming Campus. Aucun canal FR majeur n'est ni manquant ni hors d'atteinte —
sauf LinkedIn (interdit, → communautaire). Base saine, et un plan d'extension clair, profil-JV-FR en tête.
