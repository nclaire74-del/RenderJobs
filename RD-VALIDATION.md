# R&D — Validation & synthèse (point de contrôle 2026-06-02)

> **But** : faire le point sur TOUT ce qu'on a, **re-vérifier en réel** chaque source, et croiser
> 3 niveaux — **documenté** (R&D) ↔ **implémenté** (code) ↔ **vérifié live** (aujourd'hui). Document
> de synthèse, read-only, qui chapeaute `RD-TRI.md`, `RD-SCRAPING.md`, `RD-ARTSTATION.md`.

---

## 1. Registre des sources (vérifié en réel le 2026-06-02)

| Source | Tier | Accès | Branché ? | Live 2026-06-02 | Note |
|---|---|---|---|---|---|
| **France Travail** | 1 | API OAuth (par ROME) | ✅ | ✅ OAuth 200, search 206 | clés OK |
| **Adzuna** | 1 | API clé (phrases) | ✅ | ✅ 200 (1831 sur « game developer ») | international |
| **AFJV** | 1 | RSS | ✅ | ✅ 200, 88 items | curé FR jeu |
| **Games-Career** | 1 | RSS | ✅ | ✅ 200, 11 items | curé EU/EN |
| **ATS — Greenhouse** | 1bis | API publique | ✅ | ✅ riotgames 184 | via connecteur générique |
| **ATS — Lever** | 1bis | API publique | ✅ | ✅ voodoo 34 | |
| **ATS — Ashby** | 1bis | API publique | ✅ | ✅ supercell 46 | |
| **ATS — SmartRecruiters** | 1bis | API publique | ❌ **à ajouter** | ✅ Gameloft 79 | **meilleur signal tri** (`function`) |
| **GameJobs.co** | 3 | Atom | ✅ | ✅ 200, 100 entrées | |
| **80 Level** | 3 | `__NEXT_DATA__` | ✅ | ✅ total 70 | CG large |
| **Hitmarker** | 3 | Craft+Sprig (HTML) | ✅ | ✅ 200, sprig présent | cracké par l'autre Claude |
| **Work With Indies** | 3 | (SPA) | ✅ | — | branché (ADR-0023) |
| **PixelCareer / RemoteGameJobs / HelloWork / RemoteOK / Jobicy / Remotive** | 1ter/3 | RSS/API/scrape | ✅ | — | sources remote/niche |
| **ArtStation** | ~~4~~ **→ 1** | **API publique GET** | ❌ **à brancher** | ✅ 200, total 90 | voir §4 — reclassée |

> **14 connecteurs branchés** (cf. `collectToutes()`). **2 gros restes documentés & validés mais NON branchés** :
> **ArtStation** (trivial) et **SmartRecruiters** (dans le connecteur ATS).

## 2. Résultat de la re-vérification live

**Toutes les sources testées répondent ✅** (statuts/volumes ci-dessus). Seul ajustement relevé :
- **ArtStation** : `per_page` est **obligatoire et ≥ 3** (`per_page=1/2` → 400 ; 5/50/100 → 200, `total_count`=90).
  Confirmé **côté serveur, sans auth/CSRF/navigateur** → la crainte « Tier 4 hostile » était infondée pour l'API.
- Dérives mineures normales (Greenhouse riotgames 185→184, Adzuna varie) : les flux bougent, ne pas s'attacher au chiffre.

## 3. État du code (read-only)

- **Build/qualité** : `tsc --noEmit` = **0 erreur** ; **123 tests / 21 fichiers** verts ; arbre git **propre**.
- **Pipeline** : tri **en couches strict** (ADR-0016, signaux structurés d'abord) ; **dédup inter-sources**
  livrée (ADR-0024, signature studio+titre) ; péremption des offres.
- **Sources** : 14 connecteurs ; `src/config/studios.ts` = **14 studios** (ATS).
- Derniers ADR : 0023 (+3 boards), 0024 (dédup), 0025 (+Jobicy/Remotive, « easy niche ~épuisé »).

## 4. Discordances & corrections relevées (mises au propre)

1. **`RD-TRI.md` — ROME surévalué** : j'avais classé `romeCode` 🟢 « meilleur signal cœur ». La R&D
   d'implémentation (ADR-0016) a montré que **FT mé-taxonomise** (« Cadre de santé » sous `L1510`…) → le ROME
   est **rétrogradé en plancher `connexe`**, le **cœur piloté par titre/skills**. → **Corrigé** dans `RD-TRI.md`
   (note d'avertissement ajoutée §2.1). Reste vrai : ROME excellent pour *cibler la collecte*.
2. **ArtStation — à reclasser Tier 4 → Tier 1** dans `SOURCES.md` (API publique ouverte) et **à brancher**
   (connecteur trivial, patron Adzuna/FT). Spec figée dans `RD-ARTSTATION.md`.
3. **SmartRecruiters — à ajouter au connecteur ATS** (aujourd'hui GH/Lever/Ashby seulement). Débloque
   Gameloft (79) + Keywords (29) et fournit le **meilleur signal de tri** (`function` standardisé).
4. **Couverture ATS** : 14 studios en config. **Slugs vérifiés en réel à ajouter** : `2k` (gh, 112),
   `krafton` (gh, 59), `larian` (lever, 72), `bandainamco` (gh, 8), `gearbox` (gh, 1), `crystaldynamics` (gh, 1).
   Méthode de découverte (le devinage est épuisé) : annuaire studios + fingerprint des pages carrières.

## 5. Inventaire R&D & mémoire

- **Docs racine** : `RD-TRI.md` (le tri), `RD-SCRAPING.md` (boards Tier 3), `RD-ARTSTATION.md` (API ArtStation),
  `RD-VALIDATION.md` (ce doc). + `SOURCES.md` (carte), `DECISIONS.md` (ADR), `PRODUIT.md`, `HANDOFF.md`.
- **Mémoire** (`MEMORY.md`) : moteur générique · maîtrise FT · connecteur Adzuna · trou de recall · R&D tri ·
  R&D boards · couverture ATS · R&D ArtStation.

## 6. Prochaines actions priorisées (easy wins restants)

1. **Brancher ArtStation** (trivial, ~100 % cœur) — meilleur ratio valeur/effort restant.
2. **Ajouter SmartRecruiters** au connecteur ATS + **élargir `studios.ts`** (slugs vérifiés ci-dessus).
3. Finaliser les feeds des boards moyens (`RD-SCRAPING.md` §3) : The Rookies (juniors !), Cartoon Brew, ShowbizJobs.
4. (Plus tard) couverture studios à l'échelle via découverte semi-automatisée ; couche IA sur la file `connexe`.

## 7. Verdict

**Tout ce qui est documenté tient à la re-vérification (12/12 sources live ✅)** et **tout ce qui est branché
est vert** (tsc + 123 tests). Le projet a **14 sources actives**, un **tri en couches** fidèle à `RD-TRI.md`,
et une **dédup** opérationnelle. Restent **2 gains faciles déjà cartographiés** (ArtStation, SmartRecruiters)
et 1 correction de doc faite (ROME). Aucune incohérence bloquante. Base saine pour la suite.
