# HANDOFF — Point de reprise

> À lire en premier au démarrage d'une session (avec `CLAUDE.md` + `DECISIONS.md`).
> Mis à jour avant chaque `/clear`. Format court et opérationnel.

**Dernière mise à jour** : 2026-06-01
**Phase en cours** : Phase 0 — Fondations (scaffold + infra prêts ; reste : couche données + 1er connecteur)
**Source de vérité du code** : le **serveur Linux** (`~/ClaraAFJV`). Le repo Windows d'origine est obsolète.

---

## 🖥️ Environnement (serveur de dev — TOUT se passe ici)

- Hôte : **`333SRV`**, Debian 13, `clara@192.168.1.175`, projet dans **`~/ClaraAFJV`**.
- **Claude Code tourne directement sur le serveur** (`~/.local/bin/claude`, v2.1.159).
- Outils : **node v20.20**, npm 10.8, git 2.47. `clara` a le **sudo sans mot de passe**.
- Lancement depuis le PC Windows : script `Lancer-ClaraAFJV.cmd` (SSH par clé, sans mot de passe).
- **Accès aux tests** : la proprio teste DEPUIS son PC Windows (même LAN). Toujours donner l'URL
  **`http://192.168.1.175:3002`** (jamais `localhost`). MCP Chrome = sur le PC Windows → viser l'IP serveur.
  Port projet = **3002** (3000/3001 pris par Lumina/Périple). `npm run dev` écoute sur `0.0.0.0:3002`.
  ufw : 3002 ouvert pour le LAN. Détails dans `CLAUDE.md` §5bis.

## 🗄️ Base de données (prête)

- **PostgreSQL 17.10 natif** (paquet Debian), cluster `main` sur le **PORT 5434**.
  ⚠️ Les ports **5432 et 5433 sont des conteneurs Docker Postgres d'AUTRES projets**
  (`postgres-333fm`, `postgres-debrid333`) — **ne pas y toucher**.
- Rôle applicatif **`hub`** / base **`hub_emploi`** (testé : connexion OK).
- Accès via `DATABASE_URL` dans `~/ClaraAFJV/.env.local` (déjà rempli).

## 🔑 Secrets — dans `~/ClaraAFJV/.env.local` (chmod 600, NON versionné)

Déjà présents : `FRANCE_TRAVAIL_CLIENT_ID`, `FRANCE_TRAVAIL_CLIENT_SECRET` (app « claraefjv »),
`DATABASE_URL` (port 5434), `CRON_SECRET`. À ajouter plus tard : clé **Adzuna**.
> ⚠️ Hygiène : les clés FT figurent dans l'historique git initial (commit de bascule) et ont transité
> par la conversation. Repo privé/auto-hébergé donc risque faible, mais **régénérer les clés FT sur
> francetravail.io** reste l'option propre si besoin (puis mettre à jour `.env.local`).

## ✅ Fait à ce jour

- R&D + stack figée (ADR-0001→0008). Décisions stratégiques : scraping agressif zone grise (ADR-0007,
  ligne rouge RGPD) ; tout **auto-hébergé** sur le serveur (ADR-0003).
- Scaffold Next.js 16.2.6 migré sur le serveur (git + historique intacts), **`npm ci` + `npm run build` verts** sous Linux.
- PostgreSQL installé + base/rôle créés + `.env.local` rempli et testé.
- Docs : `CLAUDE.md`, `DECISIONS.md`, `SOURCES.md` (carte des sources R&D), `README.md`.

## ▶️ Prochaines actions (sur le serveur, dans l'ordre)

1. Ajouter la couche données : `npm i drizzle-orm pg` + `npm i -D drizzle-kit @types/pg vitest`.
   Configurer Drizzle (`drizzle.config.ts`) pointant sur `DATABASE_URL`.
2. Définir le type **`Offre`** (`src/domain/offre.ts`) d'après `plan` §7, + schéma **Drizzle**
   (`src/db/schema.ts`, table `offres`, clé d'unicité `source+sourceId`). Générer/appliquer la migration.
3. **1er connecteur Tier 1 = France Travail** (`src/sources/france-travail/`) :
   - ⚠️ **Vérifier d'abord** les endpoints sur `francetravail.io/produits-partages/documentation`
     (OAuth2 client-credentials : token endpoint + scope `api_offresdemploiv2`/`o2dsoffre` ; search endpoint).
   - `fetch()` (auth + recherche mots-clés 3D/jeu/VFX) → `normalize()` (Zod) → type `Offre`.
4. Pipeline minimal : `fetch → normalize → upsert (dédup) → afficher` sur la page d'accueil. Test Vitest sur `normalize`.
5. Ensuite : connecteur **Adzuna** (clé API simple) pour élargir le flux. Puis enrichissement (logiciel/spé/exp).

## ⚠️ Pièges / à savoir

- **Next.js 16 = breaking changes** : lire `node_modules/next/dist/docs/` avant routing/API (cf. `AGENTS.md`).
- **Port DB = 5434** (pas 5432). Nom de package = `hub-emploi-3d`.
- France Travail : valider les endpoints avant de coder (connaissances potentiellement périmées).
- Playwright/cheerio : à installer seulement quand on attaque les connecteurs scrapés (Tier 3 de `SOURCES.md`).

## ❓ Décisions ouvertes (§10 du plan, pour plus tard)

- Stockage emails d'alerte (Phase 2) · Discord public ou webhook privé (Phase 2) · priorisation RSS (Phase 1).
