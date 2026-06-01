# HANDOFF — Point de reprise

> À lire en premier au démarrage d'une session (avec `CLAUDE.md` + `DECISIONS.md`).
> Mis à jour avant chaque `/clear` ou changement de machine. Format court et opérationnel.

**Dernière mise à jour** : 2026-06-01
**Phase en cours** : Phase 0 — Fondations
**⚠️ CHANGEMENT MAJEUR DE WORKFLOW** : le développement passe **sur le serveur Linux** (voir ci-dessous).

---

## 🖥️ Workflow & environnement (NOUVEAU)

- Le dev se fait **sur le serveur Linux personnel** : `192.168.1.175`, user **`clara`** (mdp `333fm`),
  dossier projet **`~/ClaraAFJV`**. **Claude Code tourne directement sur le serveur** (déjà installé dessus).
- Le PC Windows ne sert plus qu'à **lancer la session** SSH vers le serveur.
- **Avantage** : plus de barrière local/distant ; Postgres + robot + site vivent au même endroit (cf. ADR-0003).
- Ce dépôt a été amorcé sur Windows puis **transféré via un git bundle** (historique préservé).

## ✅ Fait à ce jour

- R&D + stack (ADR-0001→0008) : Next.js 16 · Tailwind v4 · **PostgreSQL serveur auto-hébergé** + Drizzle · Zod · Vitest · Playwright.
- Scaffold Next.js 16.2.6, build vert (à refaire `npm install` côté Linux — binaires natifs).
- Docs de pilotage : `CLAUDE.md`, `DECISIONS.md`, `SOURCES.md` (carte des sources R&D), `README.md`.
- **Décisions stratégiques** : scraping agressif zone grise (ADR-0007, ligne rouge RGPD) ; tout auto-hébergé.
- **Clé/identifiants déjà obtenus** : voir section secrets ci-dessous.

## ▶️ Prochaines actions (sur le serveur, dans l'ordre)

1. `npm install` (réinstaller les deps en natif Linux). Vérifier `npm run build`.
2. Installer/configurer **PostgreSQL** sur le serveur (paquet système), créer la base `hub_emploi` + un rôle dédié.
3. Ajouter les deps data/collecte : `drizzle-orm drizzle-kit @types/pg pg zod vitest`.
   (Playwright + cheerio plus tard, pour les connecteurs Tier 3.)
4. Définir le type **`Offre`** (`src/domain`) + schéma **Drizzle** (table `offres`) d'après `plan` §7.
5. 1er connecteur **Tier 1** = **France Travail** (OAuth2 client-credentials). Pipeline : `fetch → normalize (Zod) → upsert → afficher`. Test Vitest sur `normalize`.
6. Ensuite : connecteur **Adzuna** (clé simple) pour élargir le flux.

## 🔑 Secrets (à mettre dans `~/ClaraAFJV/.env.local` sur le serveur — NON versionné)

- **France Travail** (créés sur francetravail.io, app « claraefjv ») :
  - `FRANCE_TRAVAIL_CLIENT_ID=PAR_claraefjv_c11330ff07b04578147bfe151145cda82b77bbf75dcd05a2e553a71dd12b015e`
  - `FRANCE_TRAVAIL_CLIENT_SECRET=c85002e92f4e5d252cd7ede589be6dfad7fcb6541a84945dc9b1bfaa4b6b65cd`
- `DATABASE_URL=postgresql://<role>:<pw>@localhost:5432/hub_emploi` (à finaliser après install Postgres).
- À créer plus tard : clé **Adzuna** (developer.adzuna.com).
> Ce bloc secrets est ici pour la transition. Une fois `.env.local` créé sur le serveur, **retirer les
> valeurs de ce fichier** (HANDOFF est versionné). Penser à régénérer les clés FT si la conv. a fuité.

## ⚠️ Pièges / à savoir

- **Next.js 16 = breaking changes** : lire `node_modules/next/dist/docs/` avant routing/API (cf. `AGENTS.md`).
- Nom de package = `hub-emploi-3d` (npm refuse les majuscules du dossier).
- Vérifier les outils présents côté serveur : `node -v`, `npm -v`, `git --version`, `psql --version`.
- France Travail : valider endpoints OAuth2 + recherche sur `francetravail.io/produits-partages/documentation`
  (mes connaissances peuvent être périmées — vérifier avant de coder le connecteur).

## ❓ Décisions ouvertes (§10 du plan, pour plus tard)

- Stockage emails d'alerte (Phase 2) · Discord public ou webhook privé (Phase 2) · priorisation RSS (Phase 1).
