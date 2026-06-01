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
