# Carte des sources — Hub d'Emploi 3D / Jeu / VFX / Animation

> Livrable de R&D (mis à jour au fil de l'eau). Objectif : couverture **maximale** des offres
> publiques du secteur. Classé par **méthode d'accès** (du moins risqué au plus risqué).
> Rappel légal permanent : **offres publiques uniquement**, jamais de données personnelles (RGPD).
> Posture validée : **agressive / zone grise** (ADR-0007), déployée **par étapes** (le plus
> atteignable et le moins risqué d'abord).

Dernière R&D : **2026-06-02** (vérification web des méthodes d'accès). Méthodes notées :
🟢 API/flux officiel · 🟡 backend interrogeable (Algolia/JSON) · 🟠 scraping (HTML public) ·
🔴 hostile (anti-bot/ToS) · ⚫ ligne rouge (jamais).

---

## Contexte marché (à garder en tête)

Le marché **jeu vidéo** s'est contracté d'environ **71 % d'offres entre 2022 et 2025** (source AFJV).
Conséquence stratégique : la demande étant **mince**, on **multiplie les sources** et on n'agrège pas
que le jeu — aussi **VFX / film / animation / pub / 3D temps réel** — pour du volume ET de la pertinence.
La classification (ADR-0011) protège le flux : on peut élargir le filet sans saturer le « cœur ».

---

## ⭐ Ordre d'implémentation recommandé (par valeur/effort)

1. ✅ **France Travail** (API, fait — ADR-0010/0011).
2. **AFJV — RSS** 🟢 : `emploi.afjv.com/rss.xml`. **Sans clé**, cœur jeu vidéo **France**, très haute
   densité de pertinence. → **prochaine source idéale** (zéro friction, mission-critique).
3. **Games-Career — RSS par métier** 🟢 : sans clé, jeu vidéo Europe/DE. Même effort qu'AFJV.
4. **APIs remote sans/peu de friction** 🟢 : Arbeitnow (sans auth), Remotive, RemoteOK → remplit le
   filtre Remote et l'international tech à bas coût.
5. **Adzuna / Jooble** 🟢 (clé gratuite) : volume + international + **salaire**. *Optionnel* (cf. §Adzuna).
6. **Scraping boards niche** 🟠 (Playwright) : Hitmarker, GameJobs.co, Remote Game Jobs, 80 Level,
   Games Jobs Direct, boards VFX. **Le vrai cœur du « Joker »** — gros volume niche.
7. **Hostiles** 🔴 (infra proxy d'abord) : ArtStation, Indeed, LinkedIn (offres formelles only), WtJ.

---

## Tier 1 — API / flux officiels (faible risque, à brancher en PREMIER)

| Source | Accès | Périmètre | Notes (vérifié 2026-06) |
|---|---|---|---|
| **France Travail** | 🟢 API OAuth2 gratuite | France | ✅ Fait (par codeROME). ADR-0006/0010. |
| **AFJV** | 🟢 **RSS `/rss.xml`** | **Jeu vidéo FR** + Belgique | ✅ **Fait (ADR-0012)** : connecteur `src/sources/afjv/`, 88 offres, plancher `connexe`. Pépite FR. |
| **Games-Career.com** | 🟢 RSS par métier | Jeu vidéo Europe/DE | ✅ **Fait (ADR-0013)** : `games-career.com/rss/Joboffer` (global) ou par métier. `content:encoded` = desc HTML riche. Contenu **EN**. |
| **Adzuna** | 🟢 API (clé gratuite app_id+app_key) | 12+ pays + **salaire** | Tier gratuit généreux. Agrégateur **généraliste** (densité niche faible). *Optionnel.* |
| **Jooble** | 🟢 API REST (clé) | Multi-pays | Agrégateur. Complément géo. |
| **Arbeitnow** | 🟢 API **sans auth** | Europe (DE) + remote | Tier gratuit, beaucoup de remote tech. |
| **Remotive / RemoteOK** | 🟢 API | 100 % remote tech/design | Pratique pour le filtre Remote. |
| ~~**EURES**~~ | 🔴 API **réservée aux partenaires** | Europe | **Vérifié 2026-06 : pas librement utilisable** (accès limité aux organisations partenaires reconnues). Écarté pour l'accès direct. |

## ⭐ Tier 1bis — API publiques d'ATS par studio (🟢 sans clé, JSON, légal) — **GROS DÉBLOCAGE**

Beaucoup de studios hébergent leur page carrière sur un **ATS** dont l'**API de job board est publique**
(pas d'auth, JSON propre, descriptions complètes). On **cible un studio = on ajoute son slug**.
Pertinence quasi **100 %** (ce sont les offres directes des studios). Vérifié en réel 2026-06-02 :

| ATS | Endpoint (par entreprise) | Vérifié | Notes |
|---|---|---|---|
| **Greenhouse** | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true` | ✅ **Riot = 185 offres** | `content=true` → desc HTML + departments + metadata. Le plus riche. |
| **Lever** | `https://api.lever.co/v0/postings/{slug}?mode=json` | ✅ **Voodoo = 34 offres** | Filtres natifs (team/location/commitment). |
| **Ashby** | `https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | à tester | Salaire propre via `includeCompensation`. |
| **SmartRecruiters / Workable** | endpoints publics par entreprise | à tester | Idem, à cataloguer si studios concernés. |

**Caveat** : les **slugs** se découvrent **un par un** (devinettes souvent en 404 ; ex. `ubisoft`,
`unity`, `king` → 404 / autre ATS type Workday). → bâtir une **liste curée de studios** (slug + ATS),
pilotée par config `src/config/studios.ts`. **Connecteur générique ATS** = 1 seul code, N studios →
forte scalabilité. **Candidat n°1 pour la prochaine grosse étape source.** Mine de slugs :
[Ultimate List of Game Company Job Boards](https://www.gameindustrycareerguide.com/ultimate-list-game-company-job-boards/).

**Liste-amorce VÉRIFIÉE en réel (2026-06-02)** — `slug` / ATS (offres au sondage) :

| Greenhouse | Lever | Ashby |
|---|---|---|
| `roblox` (252), `scopely` (202), `riotgames` (185), `epicgames` (124), `rockstargames` (79), `discord` (71), `naughtydog` (11), `housemarque` (7), `singularity6` (5), `digitalextremes` (3), `wooga` (2), `bungie` (1) | `voodoo` (34), `avalanchestudios` (17), `kabam` (15), `jamcity` (6), `theorycraftgames` (1) | `voodoo` (123), `supercell` (46), `thatgamecompany` (25), `improbable` (6), `take2` (5), `paradox` (3), `secondDinner` (2) |

> Existants mais 0 offre au sondage (à garder, ils rouvriront) : `mediatonic`/gh, `frontier`/ashby,
> `niantic`/ashby, `pocketgems`/gh, `jagex`/lever. `voodoo` répond sur Lever **et** Ashby → préférer Ashby (plus complet).
> **VFX/anim** (DNEG, Framestore, Weta, ILM, Digital Domain, Cinesite…) **ne répondent pas** sur ces ATS
> → passer par leurs boards dédiés (Tier 3, scraping) plutôt que par ATS.

## Tier 1ter — APIs remote gratuites (🟢 sans auth) — volume + contenu **EN**

Génériques (filtrage niche nécessaire, par tag/mot-clé à la source + classifieur). Utiles pour le
**remote** et pour éprouver l'enrichissement EN. Vérifiées 2026-06 :

| Source | Endpoint | Notes |
|---|---|---|
| **Himalayas** | `https://himalayas.app/jobs/api` (+ `/search`, + RSS Atom) | Sans auth. Filtres seniority/type/timezone. |
| **Jobicy** | `https://jobicy.com/api/v2/remote-jobs` (+ RSS) | 50 dernières. **Attribution demandée**. Params `industry`/`tag`. |
| **RemoteOK** | `https://remoteok.com/api` (JSON) + RSS | **Attribution requise**. Tags (design, dev…). |
| **Arbeitnow** | API publique sans auth | Europe + remote (déjà en Tier 1). |

## Tier 2 — Backends interrogeables (faible/moyen risque)

| Source | Accès | Périmètre | Notes |
|---|---|---|---|
| **Welcome to the Jungle** | 🟡 backend **Algolia** | FR + tech/startups | Index Algolia interrogeable (search_jobs, salaire, contrat). Studios/tech présents. Pas d'API « officielle » publique → à manier proprement. |
| **HelloWork** | 🟠 pas d'API de consommation | FR généraliste | Le flux JSON HelloWork est réservé aux **recruteurs** diffusant *leurs* offres ; pour nous → **scraping** HTML (offres publiques). |
| **GamesIndustry.biz / PocketGamer.biz** | 🟡 sections jobs, RSS probable | Industrie jeu | À vérifier au branchement. |

## Tier 3 — Boards niche à scraper (posture agressive, cœur du « Joker »)

Pas d'API publique → navigateur automatisé (Playwright). Offres **publiques d'entreprises**.

**Jeu vidéo / esport :**
- **Hitmarker** (hitmarker.net) 🟠 — **plus gros board gaming/esport mondial**, milliers d'offres/mois. Priorité scraping.
- **GameJobs.co** 🟠 + **Remote Game Jobs** (remotegamejobs.com) 🟠 — game dev, fort en remote.
- **GameJobs.com** 🟠 — industrie jeu (à distinguer de GameJobs.co).
- **Games Jobs Direct** 🟠 — UK/USA/Canada/Australie.
- **80 Level Talent** (80.lv) 🟠 — art/tech jeu, qualitatif.
- **Work With Indies** 🟠 (option RSS) — jeux indés.

**Art 3D / médias :**
- **The Rookies** (therookies.co) 🟠 — **juniors/talents émergents** (cible n°1 du produit). Priorité.
- **Zerply** 🟠 — VFX & animation.

**VFX / film / animation :** (les grands studios VFX — DNEG, Framestore, Weta, ILM, Digital Domain,
Cinesite… — **ne sont PAS sur les ATS publics** (cf. Tier 1bis) → c'est ICI qu'on les capte.)
- **VES Job Board** (vesglobal.org/jobboard), **vfxjobs.com**, **vfxengine.com** 🟠 — boards VFX dédiés (offres studios worldwide).
- **Rebelway** (Houdini) 🟠 — excellent pour le filtre logiciel Houdini.
- **ShowbizJobs** (animation-vfx), **ProductionHUB**, **AWN (Animation World Network)** 🟠 — animation/film US fort. AWN a un **flux RSS** (à brancher).
- **Mandy.com** 🟠 — crew film/TV (filtrer le casting).

## Tier 4 — Hostiles (étape ultérieure, infra proxy requise)

Fort volume mais **anti-bot agressif** et/ou ToS hostiles → **après** infra résiliente (proxies, vrai navigateur).
- **ArtStation Jobs** (artstation.com) 🔴 — le plus gros board **art** games/film, MAIS **Cloudflare Bot
  Management** actif (vérifié). Très haute valeur, mais à attaquer en dernier / avec précautions.
- **Indeed** 🔴 — **Publisher API dépréciée** (plus de nouvelles intégrations) ; reste l'API Sponsored
  (payante, annonceurs). → scraping uniquement, hostile.
- **LinkedIn Jobs** 🔴 — pas d'API publique d'offres ; **offres formelles publiques uniquement**.
- **Welcome to the Jungle** (si l'accès Algolia se ferme) · **APEC** (cadres FR) · **Jobijoba**.

## Mauvais fit / hors-scope

- **Malt** ⚠️ — marketplace **inversée** (les entreprises *cherchent* des freelances ; pas un board
  d'annonces à consommer). Peu adapté à notre modèle « offres ». À écarter pour l'instant.
- ⚫ **Posts personnels de recruteurs** (LinkedIn « on recrute ») → **RGPD, ligne rouge définitive**.
  Captés uniquement via **soumission communautaire** (humain dans la boucle).

---

## Note — Adzuna est-il nécessaire ?

**Non, pas indispensable.** La clé Adzuna ne sert qu'à utiliser *l'API d'Adzuna* (gratuite, inscription
30 s). Mais Adzuna est un **agrégateur généraliste** : volume et salaire à bas coût, mais **faible densité
niche** (mêmes parasites que FT, absorbés par notre classifieur). On obtient **mieux et sans clé** avec
les **RSS niche** (AFJV, Games-Career) puis le **scraping** des boards spécialisés. → Adzuna = *bonus de
volume optionnel*, jamais un prérequis. Priorité aux sources à forte densité métier.

---

## Filtres « différenciants » — vocabulaire d'enrichissement (implémenté, ADR-0011)

Détection dans le texte des annonces (`src/pipeline/enrichir.ts`, bilingue FR/EN) :
- **Logiciels** (cœur) : Blender, Maya, 3ds Max, ZBrush, Houdini, Cinema 4D, Substance, Nuke, Mari,
  Unreal Engine, Unity, Marvelous Designer, SpeedTree, Toon Boom, Arnold, V-Ray, Redshift… ;
  (motion) After Effects, Premiere ; (print) Photoshop/Illustrator/InDesign ; (CAO indus → hors-scope)
  SolidWorks/CATIA/3DX ; (AEC → neutre) AutoCAD/Revit.
- **Spécialités** : character, environment, rigging, modeling, texturing/look-dev, lighting,
  compositing, VFX/FX, animation, motion-design, concept-art, game-design, storyboard, matte-painting,
  previz, rotoscopie, archviz.
- **Niveaux** : junior, confirmé, senior, lead/principal/director.
