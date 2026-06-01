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

## ADR-0003 — Base de données : PostgreSQL + Drizzle ORM, hébergé sur Neon

- **Date** : 2026-06-01
- **Contexte** : Besoin de recherche plein-texte (filtres déduits) et de requêtes géo (rayon de distance),
  sur du serverless (Vercel). Couche d'accès typée et légère.
- **Options ORM** : Drizzle vs Prisma. **Options DB** : Postgres (Neon/Supabase) vs SQLite proto.
- **Décision** : **PostgreSQL** + **Drizzle ORM**, hébergé sur **Neon**.
- **Raison** : Postgres = plein-texte (`tsvector`) et géo (`earthdistance`/PostGIS) natifs.
  Drizzle est edge-native, bundle minuscule, contrôle SQL fin (utile pour plein-texte/géo) et excellent
  en cold-start serverless. Neon = Postgres serverless avec free tier généreux et branches de dev.
- **Alternative écartée** : Prisma (plus d'abstraction/écosystème, mais bundle plus lourd et moins de
  contrôle SQL pour nos requêtes spécifiques).

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
