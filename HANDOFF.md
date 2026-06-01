# HANDOFF — Point de reprise

> À lire en premier au démarrage d'une nouvelle session (avec `CLAUDE.md` + `DECISIONS.md`).
> Claude met ce fichier à jour avant chaque `/clear`. Format court et opérationnel.

**Dernière mise à jour** : 2026-06-01
**Phase en cours** : Phase 0 — Fondations

---

## ✅ Fait à ce jour

- R&D versions + stack tranchée (ADR-0001→0006) : Next.js 16 · Tailwind v4 · Postgres+Drizzle/Neon · Zod · Vitest.
- Scaffold Next.js 16.2.6 à la racine, build **vert**. Git initialisé (2 commits).
- Docs de pilotage : `CLAUDE.md` (mémoire + accord de collab + protocole session), `DECISIONS.md` (ADR), `README.md`.
- **Décision stratégique** : posture de collecte = **scraping agressif zone grise** des offres publiques,
  par étapes (ADR-0007). Ligne rouge : aucune donnée personnelle (RGPD).
- Moteur retenu : **Playwright**, stratégie **API/RSS d'abord** (ADR-0008).
- **Carte des sources** R&D : `SOURCES.md` (Tier 1 API → Tier 4 zone grise avancée).

## ▶️ Prochaine action (précise)

1. Installer les dépendances socle de la couche données + collecte :
   `drizzle-orm`, `drizzle-kit`, driver Neon (`@neondatabase/serverless`), `zod`, `vitest`, `playwright`, `cheerio`.
2. Définir le type **`Offre`** (domain) + schéma **Drizzle** (table `offres`) d'après `plan` §7.
3. Premier connecteur **Tier 1** : France Travail (OAuth2 client-credentials) **ou** Adzuna (clé simple) —
   commencer par le plus rapide à brancher pour afficher un flux réel. Valider via `francetravail.io` / `developer.adzuna.com`.
4. Pipeline minimal : `fetch → normalize (Zod) → upsert DB → afficher`. Tests Vitest sur `normalize`.

## ⚠️ Pièges / à savoir

- **Next.js 16 = breaking changes** : lire `node_modules/next/dist/docs/` avant routing/API (cf. `AGENTS.md`).
- Dossier racine `Scrap_Emplois` a une majuscule → nom de package = `hub-emploi-3d` (npm refuse les majuscules).
- **MCP Chrome non connectée** actuellement : prévue pour l'exploration R&D des sources, pas la prod.
- Pas encore de `DATABASE_URL` ni de clés API réelles : remplir `.env.local` à partir de `.env.example`
  (nécessite : créer projet Neon + comptes francetravail.io / Adzuna). **Action humaine possible requise.**

## ❓ Questions ouvertes (décisions §10 du plan, pour plus tard)

- Stockage emails d'alerte (Phase 2) · Discord public ou webhook privé (Phase 2) · priorisation RSS (Phase 1).
- À venir bientôt : **création des comptes/clés API** (France Travail, Adzuna, Neon) — nécessite la proprio.
