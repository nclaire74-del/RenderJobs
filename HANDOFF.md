# HANDOFF — Point de reprise

> À lire en premier au démarrage d'une session (avec `CLAUDE.md` + `DECISIONS.md`).
> Mis à jour avant chaque `/clear`. **Court et opérationnel** — l'historique détaillé est dans `DECISIONS.md` (ADR).

**Dernière mise à jour** : 2026-06-02 — fin du **chantier sourcing** (sites durs faits). Phase **1 (MVP)**.

## 🎯 État en une page

- **19 sources vivantes** collectées en continu, base **propre** (~2200 offres : **cœur + connexes uniquement**,
  les `hors_scope` ne sont plus stockées — ADR-0028). Tout est **commité**, arbre **propre**, `tsc`+`eslint`+**~142 tests** verts.
- **Sources** (cf. `SOURCES.md` pour le détail/méthode) :
  - **API / flux** : France Travail, Adzuna, AFJV (RSS), Games-Career (RSS), GameJobs.co (Atom),
    RemoteOK, Jobicy, Remotive (API remote), **ArtStation** (API publique → 54 cœur 3D), ATS studios (GH/Lever/Ashby).
  - **Fetch léger (cheerio)** : RemoteGameJobs, Work With Indies (RSS), PixelCareer (RSS), 80 Level (JSON embarqué), Hitmarker (sitemap+JSON-LD).
  - **Navigateur (Playwright)** : **AWN**, **GrackleHQ**, **Indeed** (recherche FR). Brique `src/lib/navigateur.ts` (`htmlRendu`/`htmlRenduLot`).
  - **Écartés/différés** (ADR-0029) : The Rookies (= fichier Dropbox), Cartoon Brew (DNS mort), ShowbizJobs (SPA à facettes, à reprendre). **LinkedIn = exclu** (RGPD/juridique).
- **Temps réel** (ADR-0022) : **cron système 3 vitesses** — **express 5 min** (flux curés à 1 requête : AFJV,
  Games-Career, GameJobs.co → latence ≤ 5 min, sans purge) / léger **20 min** (sources rapides) / complet **2 h**
  (+ FT, Adzuna, Hitmarker, HelloWork, AWN, GrackleHQ, Indeed = navigateur). `scripts/cron-collect.sh [express|leger]`
  (flock **par mode** + log `collect.log`). Démon `cron` actif. La collecte tourne via `tsx` (indépendante du build du site).
- **Always-on** : le site tourne en **build de prod** sous **systemd `clara-hub`** (auto-restart + boot). Cf. `deploy/README.md`.
  → après toute modif de **code** : `npm run build && sudo systemctl restart clara-hub`. La **collecte** (données) ne nécessite pas de rebuild.
- **Pipeline** : `normalize → enrichir → classer (tri STRICT, ADR-0016) → upsert (sans hors_scope)`. Plancher `connexe`
  pour les boards curés ; **pas de plancher** pour les filets larges (Adzuna/Hitmarker/HelloWork/RemoteOK/AWN/Indeed).
- **Purge** (ADR-0020) : offre non revue > 30 j = supprimée (garde-fou : ≥1 source réussie).
- **Dédup inter-sources** (ADR-0024) : signature `cle_dedup` (studio+titre normalisés) ; à la lecture on garde
  la source la plus directe (ATS>FT>boards>agrégateurs). Non destructif.
- **Surveillance** (ADR : surveillance.ts) : alerte si une source **plante** ou **revient à 0** alors qu'elle avait des
  offres. Log `collect.log` (`⚠️`) + webhook si `ALERT_WEBHOOK_URL` (Discord) dans `.env.local`.

## 🖥️ Environnement (tout se passe sur le serveur)

- Hôte **`333SRV`** Debian 13, `clara@192.168.1.175`, projet **`~/ClaraAFJV`**. Claude Code tourne **sur le serveur**.
  node v20.20, npm, git ; `clara` a **sudo sans mot de passe**.
- **Tester depuis le PC Windows** : ouvrir **`http://192.168.1.175:3002`** (JAMAIS `localhost`). Port projet = **3002**.
  ufw : 3002 ouvert au LAN. MCP Chrome (PC Windows) → viser l'IP serveur. Détails `CLAUDE.md` §5bis.
- **DB** : **PostgreSQL natif, PORT 5434** (⚠️ 5432/5433 = conteneurs Docker d'AUTRES projets, ne pas toucher).
  Rôle `hub` / base `hub_emploi`. `DATABASE_URL` dans `.env.local`.
- ⚠️ **2 Claude travaillent en parallèle** sur ce repo (coordination via ce HANDOFF + commits). Fichier `RD-SCRAPING.md`
  (non suivi) appartient à l'autre Claude — ne pas le committer.
- Commits **locaux** (pas de remote configuré).

## 🔑 Secrets — `~/ClaraAFJV/.env.local` (chmod 600, gitignoré)

`FRANCE_TRAVAIL_CLIENT_ID/SECRET`, `DATABASE_URL`, `CRON_SECRET`, `ADZUNA_APP_ID/KEY`, opt. `ALERT_WEBHOOK_URL`.
Liste à jour = `.env.example`.
> ✅ **Audit hygiène** : `.env.local` non suivi ; **aucune clé** dans les fichiers suivis NI l'historique git.
> `CRON_SECRET` régénéré. Reste : les clés FT/Adzuna ont transité par la **conversation** → pour durcir avant
> ouverture publique, les régénérer sur les portails (procédure : `deploy/README.md`). **Action proprio**, non urgente.

## ▶️ Prochaines actions possibles (le sourcing est solide — pivot produit conseillé)

1. **Décision produit** : l'onglet **« connexes » est volumineux** (~1500) — le resserrer (cacher le corporate de studio)
   ou le garder large ? *(arbitrage proprio)*
2. ✅ **FAIT (2026-06-02)** : **filtres différenciants** dans le dashboard — **logiciel** / **spécialité** / **mode de travail**
   (le niveau existait déjà). Selects peuplés par facettes (`listerLogiciels`/`listerSpecialites`, `unnest`+comptage, triés par
   fréquence). Containment `text[] @>` côté repo, params portés dans l'URL (partageable). Spécialités libellées FR. Commit `0af4a6a`.
   ✅ **+ enrichissement (commit `ebc1075`)** : +10 spécialités (programmation, technical-art, ui-ux, audio, qa, narration,
   production, graphisme, illustration, generaliste-3d) + fix « level designer ». Offres sans étiquette **678 → 382**.
   Nouveau script **`npm run reenrichir [-- --apply]`** (dry-run par défaut) à relancer à **chaque évolution du lexique**
   `enrichir.ts` pour ré-étiqueter les offres déjà en base. ⚠️ `classer.ts` n'utilise PAS `specialites` (ajouts sûrs, pas de reclassement).
   → **Reste possible** : étiquettes cliquables (clic sur un tag = applique le filtre) ; recherche `q` en plein-texte natif Postgres
   (actuellement `ILIKE`) ; facettes dépendantes des filtres courants (aujourd'hui elles ne dépendent que de la vue).
3. **Dédup affinée par lieu** (éviter de sur-fusionner des postes distincts d'un même studio au même titre).
4. **Sources restantes** : ShowbizJobs (analyse fine), Cartoon Brew (retrouver l'URL), collecte incrémentale Hitmarker
   (éviter de re-fetch 150 pages). Indeed dépend du bon vouloir de Cloudflare → la surveillance préviendra si ça casse.
5. **Phase 2** : alertes email/Discord pour les utilisateurs (≠ alertes techniques), mentions légales + politique de confidentialité
   dès qu'on stocke des emails.

## ⚠️ Pièges / à savoir

- **Next.js 16 = breaking changes** : lire `node_modules/next/dist/docs/` avant routing/API (cf. `AGENTS.md`).
- **Playwright** : `import` **dynamique** dans `navigateur.ts` (sinon casse le build Next). Browsers dans `~/.cache/ms-playwright`.
- Sources **navigateur** (AWN/GrackleHQ/Indeed) = **lentes** (~12-26 s) → réservées au **cron complet 2 h**, jamais au léger.
- **Direction produit actée** (ADR-0009 / `PRODUIT.md`) : 3 classes de pertinence (flux strict + connexes), tri **STRICT**
  (cacher le hors-secteur net), international d'emblée, UI FR i18n-ready, **public n°1 = juniors**.
- **Source de vérité du code** = le serveur Linux (`~/ClaraAFJV`). Le repo Windows d'origine est obsolète.
