@AGENTS.md

# CLAUDE.md — Mémoire du projet

> Hub d'Emploi 3D & Jeu Vidéo. Ce fichier est la mémoire de travail du projet.
> Source de vérité du **périmètre/vision** : `plan-hub-emploi-3d.md` (à la racine).
> Journal des **décisions techniques** : `DECISIONS.md` (format ADR).

---

## 1. Vision (résumé)

Centraliser en un seul endroit **toutes les offres d'emploi 3D / jeu vidéo / animation /
VFX / cinématique**. L'utilisateur voit tout d'un coup, filtre par métier/logiciel/expérience,
et clique pour postuler sur la source officielle. **Sans compte, sans friction.**

Différenciateur clé : des filtres que personne d'autre n'a (logiciel, spécialité, niveau),
**déduits** par enrichissement du texte des annonces.

Principes non négociables : sans compte · redirection directe · niche assumée · fraîcheur ·
**attribution** (toujours afficher la source + lien d'origine).

**Posture de collecte (révisée — cf. ADR-0007)** : le projet repose largement sur le **scraping
agressif des offres publiques** (la plupart des sources du secteur n'ont pas d'API), déployé par
étapes via Playwright. Stratégie : **API/RSS d'abord, scraping ensuite**. **Ligne rouge absolue** :
jamais de **données personnelles** (posts perso de recruteurs) → RGPD ; ces annonces passent par la
**soumission communautaire**. Voir `SOURCES.md` pour la carte des sources.

---

## 2. Accord de collaboration

- **Claude (lead dev)** tranche SEUL toute décision technique (stack, archi, libs, structure,
  conventions, tests, outils, hébergement). Il décide, justifie brièvement, avance — et consigne
  les choix structurants dans `DECISIONS.md`.
- **La propriétaire** n'intervient que sur les décisions **stratégiques / de direction produit**
  (vision, périmètre, sources, modèle). Elle n'est pas développeuse.
- Arbitrage demandé **uniquement** quand une décision stratégique bloque réellement, via une
  question interactive : 2–4 options en langage simple, conséquences en clair, reco indiquée.
  Une question à la fois.
- En fin d'étape significative : un résumé **en langage non technique** de ce qui a été fait et
  d'où on en est sur la feuille de route.

---

## 3. Stack (voir ADR pour le détail/justification)

- **Framework** : Next.js 16 (App Router) + React 19 + TypeScript. Turbopack par défaut.
- **Style** : Tailwind CSS v4.
- **DB** : PostgreSQL (plein-texte + géo natifs) via **Drizzle ORM**. Hébergement **Neon**.
- **Validation** : Zod (parsing des API externes — couche critique).
- **Tests** : Vitest (pipeline normalisation/enrichissement surtout).
- **Scraping** : Playwright (Chromium headless) pour la prod ; fetch+cheerio quand suffisant ;
  MCP Chrome pour l'exploration R&D (non connectée pour l'instant). Cf. ADR-0008.
- **Cron** : Vercel Cron en prod ; script npm en local.
- **Notifications** : webhook Discord + email (Resend/SendGrid) — Phase 2.
- **Hébergement** : Vercel (front + cron) + Neon (Postgres).

> ⚠️ Next.js 16 a des **changements de rupture** vs les versions antérieures. Avant d'écrire du
> code de routing/API/config, consulter `node_modules/next/dist/docs/` (cf. `AGENTS.md`).

---

## 4. Structure du dépôt (cible)

```
src/
  app/                 # Next.js App Router (pages + routes API)
    api/               # routes API internes (cron, soumission, alertes…)
  domain/              # modèle métier : l'Offre normalisée + types partagés
  sources/             # connecteurs (france-travail, rss-*, communaute…) -> Offre[]
  pipeline/            # normalisation, dédup, enrichissement (logiciel/spé/exp)
  db/                  # schéma Drizzle, client, migrations
  lib/                 # utilitaires transverses
  components/          # composants UI (dashboard, filtres, cartes d'offre)
tests/                 # tests Vitest (miroir de src/)
drizzle/               # migrations générées
```

Conventions :
- **TypeScript strict**. Pas de `any` non justifié.
- Chaque **source** expose une fonction `fetch(): Promise<RawOffer[]>` + un `normalize()` qui
  ramène au type **`Offre`** commun (cf. `plan` §7). Toute donnée externe passe par un **schéma Zod**.
- L'**enrichissement** (logiciel/spécialité/expérience) est du code pur, testé unitairement.
- Composants serveur par défaut ; `"use client"` seulement si interactivité nécessaire.
- Nommage fichiers : `kebab-case`. Composants React : `PascalCase`.

---

## 5. Commandes

```bash
npm run dev          # dev local (Turbopack)
npm run build        # build de prod
npm run lint         # ESLint
npm run test         # Vitest (à venir)
```

---

## 6. Conformité (rappel permanent)

- **RGPD** : aucune collecte automatique de données personnelles (posts de recruteurs).
  Les annonces informelles passent par la **soumission communautaire** (humain dans la boucle).
- **ToS** : respecter les conditions de chaque source ; privilégier API/RSS officielles.
- **Attribution** : afficher la source de chaque offre + lien vers l'originale.
- Dès qu'on stocke des emails (alertes) : mentions légales + politique de confidentialité.

---

## 7. Hygiène de session & hand-off

Pour ne pas se perdre au fil des sessions :
- Le fichier **`HANDOFF.md`** (racine) est le **point de reprise** : état réel, prochaine action
  précise, pièges, questions ouvertes. Claude le **met à jour en fin de session** avant un `/clear`.
- Claude **dit franchement** quand il est temps de `/clear` (contexte chargé / étape close) plutôt
  que de laisser la session s'alourdir. Reprise propre = lire `HANDOFF.md` + `CLAUDE.md` + `DECISIONS.md`.
- Une session = un thème cohérent autant que possible (ex. « brancher France Travail », « connecteur
  ArtStation »), pour garder un contexte frais.

## 8. Où en est-on

Feuille de route : Phase 0 (fondations) → 1 (MVP) → 2 (vitesse/communauté) → 3 (sources avancées).
**État courant** : Phase 0 — scaffold + fondations docs posés ; posture scraping tranchée (agressive,
ADR-0007) ; carte des sources faite (`SOURCES.md`). **Prochain** : monter le moteur de collecte
(Playwright + 1er connecteur API, France Travail/Adzuna). Détail vivant dans `HANDOFF.md`.
