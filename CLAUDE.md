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
- **DB** : **PostgreSQL auto-hébergé** sur le serveur Linux (port **5434**) via **Drizzle ORM**
  (Neon abandonné — cf. ADR-0003). Recherche plein-texte = `ILIKE` aujourd'hui ; FTS `tsvector`
  prévu (roadmap audit P2). `latitude`/`longitude` stockés mais pas encore exploités.
- **Validation** : Zod (parsing des API externes — couche critique).
- **Tests** : Vitest (pipeline + `normalize` + lib). ~160 tests.
- **Scraping** : Playwright (Chromium headless) pour les sites durs ; fetch+cheerio quand suffisant ;
  MCP Chrome pour l'exploration R&D. Cf. ADR-0008.
- **Cron** : **cron système** (crontab `clara`), 3 cadences (express 5 min / léger 20 min / complet 2 h).
- **Notifications** : webhook Discord (alertes techniques) en place ; email utilisateur — Phase 2.
- **Hébergement** : **auto-hébergé** — serveur Linux `333SRV`, site servi en build prod sous **systemd
  `clara-hub`**, Postgres local. (Vercel/Neon écartés.)

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
npm run dev          # dev (écoute sur 0.0.0.0:3002 → accessible depuis le LAN)
npm run build        # build de prod
npm run lint         # ESLint
npm run test         # Vitest (à venir)
```

## 5bis. Accès réseau & tests (TRÈS IMPORTANT)

Le code et les serveurs (Next.js, Postgres, robot) tournent **sur le serveur Linux** (`333SRV`,
`192.168.1.175`). Mais la **propriétaire travaille depuis son PC Windows** sur le même réseau local,
et c'est **depuis ce PC** qu'elle teste l'app et qu'elle exécute la **MCP Chrome**. Conséquences :

- **Port du projet = `3002`** (3000 = « Lumina », 3001 = « Périple » : déjà pris par d'autres apps).
  `npm run dev`/`npm run start` écoutent sur `0.0.0.0:3002`.
- **Pour tester l'app, toujours donner l'URL réseau** : **`http://192.168.1.175:3002`** — JAMAIS
  `localhost` (localhost = le serveur, pas le PC de la proprio → elle ne verrait rien).
- **MCP Chrome (sur le PC Windows)** : tout test navigateur doit viser **`http://192.168.1.175:3002`**,
  jamais `localhost`/`127.0.0.1`. Sinon le test pointe sur le mauvais hôte et donne un faux résultat.
- **Pare-feu (ufw actif)** : port 3002 ouvert pour le LAN (`192.168.1.0/24`). Ouvrir tout nouveau
  port exposé de la même façon : `sudo ufw allow from 192.168.1.0/24 to any port <p> proto tcp`.
- La proprio n'est pas technicienne : quand on lui demande de tester, **donner les étapes complètes**
  (l'URL exacte à ouvrir, quoi cliquer, quoi observer).

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
**État courant (2026-06)** : **MVP en production** — 19 connecteurs, ~2270 offres, dédup inter-sources,
enrichissement, cron 3 cadences, surveillance, systemd. Collecte considérée **finie** (cf. AUDIT.md).
**Virage en cours** : d'agrégateur passif → **copilote** (profil + scoring de correspondance, suivi de
candidatures, badge nouveautés, alertes ciblées) ; fondation données réparée (pays). Détail vivant et
priorités dans **`HANDOFF.md`** + roadmap dans **`AUDIT.md`** §7.
