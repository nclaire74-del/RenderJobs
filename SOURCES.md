# Carte des sources — Hub d'Emploi 3D / Jeu / VFX / Animation

> Livrable de R&D (mis à jour au fil de l'eau). Objectif : couverture **maximale** des offres
> publiques du secteur. Classé par **méthode d'accès** (du moins risqué au plus risqué).
> Rappel légal permanent : **offres publiques uniquement**, jamais de données personnelles (RGPD).
> Posture de collecte validée : **agressive / zone grise** (cf. ADR-0007), mais déployée **par étapes**
> (le plus atteignable et le moins risqué d'abord).

Dernière R&D : 2026-06-01.

---

## Contexte marché (à garder en tête)

Le marché **jeu vidéo** s'est contracté d'environ **71 % d'offres entre 2022 et 2025** (source AFJV).
Conséquence stratégique : ne pas se limiter au jeu — agréger aussi **VFX / film / animation / pub**
pour offrir du volume et de la pertinence. Le secteur 3D dépasse largement le seul gaming.

---

## Tier 1 — API officielles (faible risque, à brancher en PREMIER)

Couverture énorme pour un coût/risque minimal. Plusieurs sont gratuites. **Priorité d'implémentation.**

| Source | Accès | Périmètre | Notes |
|---|---|---|---|
| **France Travail** | API OAuth2 gratuite | France, tous secteurs | Fondation (filtrer par mots-clés métier). Déjà ADR-0006. |
| **Adzuna** | API dev gratuite (clé) | Multi-pays (FR inclus) + **données salaire** | Gros agrégateur. Filtrer par mots-clés 3D/VFX/game. Très bon ratio. |
| **Jooble** | API REST (clé) | Multi-pays | Agrégateur. Bon complément géographique. |
| **Arbeitnow** | API gratuite, sans auth | Europe (DE fort) + remote | Tier gratuit généreux. Beaucoup de remote tech. |
| **Remotive** | API (remote) | 100 % remote, tech/design | Pratique pour le filtre Remote. |
| **The Muse / RemoteOK** | API | Remote / tech | À évaluer pour le remote. |
| **EURES** | API officielle UE | Europe | À évaluer (cf. plan §4). |

## Tier 2 — Flux RSS (faible risque)

Stables, légers, faits pour être consommés par des machines.

| Source | Périmètre | Notes |
|---|---|---|
| **Games-Career.com** | Jeu vidéo (Europe/DE) | RSS **par métier** (ex. "Programmer", "Artist"). Excellent. |
| **Work With Indies** | Jeux indés | Option RSS. Communauté artistes/devs. |
| **AFJV** (emploi.afjv.com) | **Jeu vidéo France** | « collecte quasi toutes les offres FR du jeu vidéo ». RSS/scrape à vérifier. **Clé pour la France.** |
| **GamesIndustry.biz / PocketGamer.biz** | Jeu vidéo (industrie) | Sections jobs, RSS probable. |

## Tier 3 — Boards spécialisés à scraper (posture agressive, vrai cœur du « Joker »)

Pas d'API publique → navigateur automatisé (Playwright). Offres **publiques d'entreprises**.

**Jeu vidéo / esport :**
- **Hitmarker** (hitmarker.net) — référence gaming/esport, gros volume.
- **Work With Indies** — jeux indés (si RSS insuffisant).
- **Games Jobs Direct** — UK/USA/Canada/Australie.
- **80 Level Talent**, **GameJobs.co** (cf. plan).

**Art 3D / médias-divertissement :**
- **ArtStation Jobs** (artstation.com) — **le plus gros board art games/film/média**. Priorité haute.
- **The Rookies** (therookies.co) — juniors / talents émergents (bon pour le filtre Junior).
- **Zerply** — VFX & animation.

**VFX / film / animation :**
- **VES — Visual Effects Society** (vesglobal.org/jobboard) — board pro VFX.
- **vfxjobs.com**, **vfxengine.com** — boards VFX dédiés.
- **Rebelway VFX/Houdini board** — offres Houdini (excellent pour le filtre logiciel Houdini).
- **ShowbizJobs** — animation/VFX/film.
- **ProductionHUB** — production film/vidéo/animation (US fort).
- **Mandy.com** — crew film/TV (surtout casting, mais crew technique présent — à filtrer).
- **AWN — Animation World Network** — animation.

## Tier 4 — Zone grise avancée (étape ultérieure, infra proxy requise)

Fort volume mais ToS hostiles + protections anti-bot → **après** que l'infra résiliente soit prête.
- **LinkedIn Jobs** (offres formelles publiques uniquement — jamais les posts perso : RGPD).
- **Indeed**, **Jobijoba**, **Job, Welcome to the Jungle**, **APEC** (cadres FR).

## Hors-scope (ligne rouge légale, définitive)

- ❌ **Posts personnels de recruteurs** (LinkedIn « on recrute ») par scraping auto → RGPD.
  Captés uniquement via **soumission communautaire** (humain dans la boucle).

---

## Filtres « différenciants » — vocabulaire d'enrichissement (à maintenir)

Mots-clés à détecter dans le texte des annonces (pipeline d'enrichissement) :
- **Logiciels** : Blender, Maya, 3ds Max, ZBrush, Houdini, Cinema 4D, Substance (Painter/Designer),
  Nuke, Unreal Engine, Unity, Marvelous Designer, SpeedTree, Katana, Mari, After Effects, Photoshop.
- **Spécialités** : Character, Environment, Prop, Rigging, Animation, VFX/FX, Lighting, Look-dev,
  Compositing, Technical Artist, Pipeline TD, Cinematic, Concept Art, Texturing, Modeling, Layout.
- **Niveaux** : Junior, Mid/Confirmé, Senior, Lead, Principal, Director.
