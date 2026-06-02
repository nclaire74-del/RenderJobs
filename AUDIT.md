# AUDIT — Hub d'Emploi 3D & Jeu Vidéo (ClaraAFJV)

> Audit technique & produit externe, indépendant. Daté du 2026-06-02.
> Méthode : exploration réelle (build, lint, tests, requêtes Postgres live, lecture du code,
> historique git, app en fonctionnement). Chaque critique est étayée par une preuve.
> Périmètre audité : commit `1506329` (master), base de prod live (2266 offres).

---

## 1. TL;DR exécutif

Le projet est **beaucoup plus avancé que ne le prétend sa propre doc** (`CLAUDE.md §8` annonce
« Phase 0 — scaffold »; la réalité est un MVP en production : 19 connecteurs, **2266 offres**
réelles, dédup inter-sources fonctionnelle, enrichissement, cron 3 vitesses, surveillance,
systemd). La **qualité de code est haute** : TypeScript strict sans `any`, Zod aux frontières,
151 tests qui passent, build et lint propres. Ce n'est pas un prototype, c'est un produit qui tourne.

**MAIS le commanditaire a raison** : c'est un agrégateur **100 % passif**. Il *affiche* de
l'information remarquablement bien filtrée, et s'arrête là. Aucun des verbes d'un vrai outil de
recherche d'emploi n'existe : *suivre* une candidature, *être alerté*, *matcher* un profil,
*comparer* des offres, *revoir ce qui est nouveau*. Le différenciateur réel (filtres logiciel /
spécialité déduits) est sous-exploité parce qu'il sert un flux qu'on ne fait que lire.

**Le pari des 15 semaines** : ne pas ajouter de sources (la collecte est *finie* et excellente),
mais **transformer l'agrégateur en copilote** — d'abord réparer la fondation données (le pays est
NULL sur 56 % du catalogue, ce qui casse un filtre « de premier plan »), puis bâtir la couche
*active* (suivi de candidatures + « nouveautés depuis ma dernière visite » + alertes), enfin la
couche *intelligente* (matching profil↔offre, scoring). Tout est réaliste sur l'existant.

Verdict : **socle technique solide (6,5/10), ambition produit à mi-chemin (5/10).** Le plafond de
verre n'est pas technique, il est conceptuel : le projet s'est arrêté pile au moment où il devenait
intéressant.

---

## 2. Tableau de scores

| Axe | Note | Synthèse |
|---|---|---|
| A. Produit & Vision | **5/10** | Agrégateur passif réussi ; potentiel d'outil actif intact mais non amorcé. |
| B. Architecture & Backend | **7/10** | Découpage propre, connecteurs résilients, surveillance ; collecte séquentielle, observabilité = 1 fichier log. |
| C. Modèle de données & Drizzle | **6/10** | Schéma & dédup bien pensés ; pays NULL 56 %, ni FTS ni GIN ni géo malgré la justification DB. |
| D. Frontend & UX/UI | **6/10** | UI sombre nette, état dans l'URL, a11y correcte ; zéro interactivité, filtre pays cassé pour la moitié du catalogue. |
| E. Qualité de code & TypeScript | **8/10** | Strict, sans `any`, sans TODO, Zod aux bords, pipeline pur. Doc partiellement périmée. |
| F. Tests & Fiabilité | **6/10** | 151 tests réels (dément le « à venir ») ; **0 test** sur la requête la plus complexe (dédup SQL). |
| G. Sécurité & Conformité | **5/10** | Secrets propres, cron authentifié ; soumission communautaire **promise et absente** → posture RGPD sur le papier. |
| H. Performance & Scalabilité | **6/10** | Excellent en mono-user (48 ms) ; facettes `unnest` + `ILIKE` sans index → dégrade à x10–x100. |
| I. DevOps & Déploiement | **5/10** | systemd + cron solides ; **aucune CI**, pas de stratégie migration prod, pas de sauvegarde dédiée repérée. |
| **GLOBAL** | **6/10** | Fondation saine, produit à franchir un palier. |

**3 forces réelles**
1. Hygiène de code rare pour un projet solo : `strict`, **0** `any`/`as any`/`TODO`/`@ts-ignore` dans `src/` (vérifié par `grep`), Zod sur **toute** donnée externe, pipeline pur testable.
2. Ingénierie de la collecte mature : 19 sources, résilience par source (une panne n'arrête pas les autres), **surveillance « vide suspect »** (détecte la casse silencieuse d'un scraper), purge sûre avec garde-fou anti-vidage, cron 3 cadences avec `flock`.
3. Le tri en couches (`classer.ts`) est une vraie pièce d'ingénierie produit : signaux structurés d'abord, titre ensuite, texte en dernier — avec des contournements documentés des erreurs de taxonomie France Travail. C'est du travail de connaisseur.

**5 faiblesses majeures**
1. 🔴 **Produit purement passif** — aucun workflow de recherche d'emploi au-delà de « voir une liste ».
2. 🔴 **Qualité données géo** — `pays` NULL sur **1262/2266** offres (56 %), ce qui rend le filtre pays (revendiqué « premier plan ») inutilisable sur la moitié du catalogue.
3. 🟠 **Soumission communautaire inexistante** — pilier de la conformité RGPD revendiqué partout dans la doc, **0 ligne de code**.
4. 🟠 **Trou de test sur le code le plus risqué** — la CTE de dédup/pagination (`offres-repo.ts`) n'a aucun test ; les 151 tests couvrent le pipeline pur et les `normalize`, pas la lecture.
5. 🟠 **Promesses DB non tenues** — ni recherche plein-texte Postgres (`ILIKE %…%` naïf), ni géo (lat/long stockés, jamais requêtés ni affichés), ni index GIN sur les tableaux. La justification « Postgres pour le plein-texte + géo natifs » est, à ce jour, du marketing interne.

---

## 3. Carte du projet (ce que le code fait *réellement*)

**Pipeline d'une offre** (vérifié de bout en bout) :
```
fetch (19 connecteurs)  →  normalize() → Offre        [src/sources/*/index.ts]
   → traiter() = enrichir() + classer() + signatureDedup() + nomPays()   [src/pipeline/traiter.ts]
   → upsertOffres()  (hors_scope JAMAIS persisté ; conflit (source, source_id))  [pipeline/upsert.ts]
   → purgeOffresPerimees()  (recupere_le < now-30j, si ≥1 source OK)            [pipeline/purge.ts]
   → analyserSante() → envoyerAlertes()  (log + webhook Discord optionnel)       [pipeline/surveillance.ts]
DASHBOARD : Server Component → offres-repo (Drizzle direct) → dédup à la LECTURE (CTE row_number)
```

**Orchestration réelle** : crontab utilisateur `clara` (vérifié — invisible depuis un autre user) :
- `*/5` express (AFJV, Games-Career, GameJobs.co) — sans purge ;
- `*/20` léger (12 sources rapides) + purge ;
- `3 */2` complet (19 sources) + purge.
Le « temps réel » revendiqué est **réel** : `collect.log` montre 12 runs express aujourd'hui,
dernier il y a 1 min. Service web sous `systemd` (`clara-hub.service`, `Restart=always`, actif).

**État base live** (requêtes Postgres exécutées) :
- 2266 offres ; **679 cœur**, **1587 connexe** (hors_scope non stocké).
- Sources : `ats` **1010** (45 %), `adzuna` 342, `france-travail` 160, `gamejobs-co` 135, le reste ≤100.
- Dédup efficace : 2266 lignes → **1897 groupes** affichables. Vrais doublons inter-sources
  confirmés (ex. `epic games::senior gameplay designer` présent dans ats + gamejobs-co + gracklehq + hitmarker, 12 copies → 1 affichée).
- Couverture champs : description 90 %, studio 96 %, **pays 44 %**, expérience 64 %, **mode 23 %**, **salaire 9 %**.

**Frontend** : un seul écran (`/`). Onglets cœur/connexe, barre de filtres `<form method=get>`
(zéro JS client), facettes dynamiques (pays/logiciel/spécialité avec comptes dédupliqués honorant
les autres filtres), pagination par lien, carte d'offre avec attribution + lien `nofollow`.
Rendu vérifié : 60 cartes, HTTP 200 en **48 ms**.

**Ce qui n'existe pas** (et que la doc laisse croire présent ou proche) : soumission communautaire,
alertes utilisateur, notifications, recherche plein-texte Postgres, carte géographique, tout suivi
de candidature, tout compte/personnalisation. Une seule route API : le cron.

---

## 4. Écarts Doc vs Réalité (promesses non tenues)

| # | Promesse (doc) | Réalité (code) | Sévérité |
|---|---|---|---|
| 1 | `CLAUDE.md §8` : « État courant : **Phase 0** — scaffold… Prochain : monter le moteur de collecte (1ᵉ connecteur API) » | 19 connecteurs en prod, MVP live, 33 ADR. §8 est **grossièrement périmé** (HANDOFF, lui, est à jour) | 🟡 |
| 2 | `CLAUDE.md §6` + `PRODUIT.md:19` : la **soumission communautaire** absorbe les annonces perso → conformité RGPD | **Aucun code.** Une seule route API (cron). Le pilier conformité n'existe pas | 🟠 |
| 3 | `CLAUDE.md §3` : « PostgreSQL (**plein-texte** + géo natifs) » | Recherche = `ILIKE '%terme%'` sur 3 colonnes (`offres-repo.ts:104`). Aucun `tsvector`, aucun index FTS | 🟠 |
| 4 | Schéma `offre.ts` : `latitude`/`longitude` + plan « filtre géo » | 430 offres ont des coordonnées, **jamais requêtées ni affichées**. Données mortes ; pas de PostGIS | 🟡 |
| 5 | `CLAUDE.md §3` : « Cron : **Vercel Cron** en prod ; Hébergement **Vercel + Neon** » | Auto-hébergé Linux (systemd + crontab + Postgres local 5434). Vercel/Neon abandonnés (cf. HANDOFF), mais §3 non corrigé | 🟡 |
| 6 | `RD-VALIDATION.md` / mémoire : « easy wins = ArtStation + SmartRecruiters » | ArtStation **fait** (90 offres) ; SmartRecruiters **jamais ajouté** au connecteur ATS | 🟡 |
| 7 | `README` historique : « Tests Vitest (à venir) » | **151 tests** présents et verts. Promesse *dépassée* (à corriger dans le sens positif) | 🔵 |
| 8 | `plan` : filtre pays « de premier plan » (R-3) | Filtre présent mais **inopérant sur 56 % du catalogue** (pays NULL) — promesse vide en pratique | 🟠 |
| 9 | `CLAUDE.md §6` : Indeed/LinkedIn = redirection respectueuse | Connecteur **Indeed** scrape `fr.indeed.com` en violation explicite de ses ToS (commenté dans le code lui-même, `indeed/index.ts:8`). Et il est **intermittent** : `collect.log` alterne `55 récupérées/30 écrites` et `0 récupérées` (anti-bot qui passe par à-coups) → non-fiable **et** hors-ToS | 🟠 |

---

## 5. Findings détaillés par axe

Format : `[sévérité] titre · preuve · impact · correctif · effort (S/M/L)`.

### A. Produit & Vision — 5/10

- 🔴 **Le produit ne fait qu'afficher.** · Preuve : une seule route (`api/cron`), aucune action utilisateur en base, `offre.ts` n'a ni « vu », ni « sauvegardé », ni « postulé ». · Impact : un chercheur d'emploi *travaille* sa recherche (suivre, relancer, comparer) — ici il ne peut que scroller, comme sur n'importe quel agrégat. Le différenciateur (filtres déduits) sert un objet qu'on consomme passivement. · Correctif : voir §6 (suivi de candidatures + nouveautés + alertes). · Effort : L.
- 🟠 **La cible #1 (junior FR) est mal servie par la donnée réelle.** · Preuve : `pays=France` = 451 offres, mais le cœur est massivement EN/US (langue `en` = 1623 vs `fr` = 341 sur l'affichable ; `ats` US = 45 % du catalogue). Les raccourcis « stage/alternance/junior » existent (`barre-filtres.tsx:171`) mais piochent dans un vivier surtout anglophone senior. · Impact : la persona prioritaire (cf. `PRODUIT.md`) voit surtout des postes inaccessibles. · Correctif : pondérer/épingler le marché FR ; ajouter un filtre langue exposé ; sources FR ciblées (déjà cartographiées : WTTJ, studios FR ATS — cf. mémoire `rd-sources-jv-france`). · Effort : M.
- 🟡 **Aucune boucle de rétention.** · Preuve : pas de « depuis votre dernière visite », pas d'historique, état 100 % stateless. · Impact : l'utilisateur doit re-scanner tout à chaque visite — l'inverse de la promesse « être le premier sur le vraiment nouveau » (`PRODUIT.md:38`). · Correctif : marqueur de fraîcheur « nouveau » basé sur `recupere_le` vs dernier passage (cookie/localStorage, sans compte). · Effort : S.
- 🟠 **Le différenciateur n°1 (filtres logiciel/contrat) est sous-alimenté.** · Preuve : sur 2 270 offres, `logiciels` est **vide à 68 %** (1 542 NULL/[]), `contrat` **vide à 67 %** (1 511), `experience` vide à 36 %. La cause structurelle : plusieurs connecteurs ne ramènent **que le titre** (Indeed `description: null` — `indeed/index.ts:104` ; GameJobs.co idem), or `enrichir()` ne peut déduire que ce que le texte contient. · Impact : la promesse « des filtres que personne d'autre n'a » ne tient que sur le **cœur** (Unreal 125, Unity 97 en facette live) ; dès qu'on combine `Houdini + senior + remote`, le résultat est une poignée d'offres. Le différenciateur est réel mais **affamé**. · Correctif : récupérer la **description complète** des connecteurs « titre seul » (la donnée existe sur la page détail) ; c'est le levier qui améliore *tous* les filtres déduits d'un coup. · Effort : M.
- 🟠 **France Travail — l'API officielle FR — ne produit quasi aucun cœur.** · Preuve : 160 offres FT en base, dont **6 seulement en `coeur`** (requête live). C'est voulu (`classer.ts:35-41` exclut le ROME de la promotion cœur car FT mal-taxonomise — un « Cadre de santé » sous code Animateur 3D), mais l'effet net est que la source la plus *légitime* et la plus *FR* est un dépôt de 154 « connexes ». · Impact : le flux **cœur** est massivement anglophone/US (`en=1623` vs `fr=341`), pile l'inverse du besoin de la persona junior FR (`PRODUIT.md`). · Correctif : exploiter l'**appellation normalisée** FT (plus fiable que le ROME brut) pour promouvoir en cœur les intitulés réellement craft ; ou pondérer le marché FR à l'affichage. · Effort : M.

### B. Architecture & Backend — 7/10

- 🟠 **Collecte strictement séquentielle.** · Preuve : `collect.ts:415` `collectToutes` enchaîne 19 `await` l'un après l'autre ; idem `ats/index.ts:250` (13 studios en série). Le commentaire annonce « ≈ 2 h ». · Impact : fenêtre de collecte longue, fraîcheur du complet dégradée, une source lente bloque la file. · Correctif : `Promise.allSettled` avec un petit pool de concurrence (p. ex. 4–6) ; les sources sont déjà isolées par try/catch donc le passage est sûr. · Effort : S.
- 🟠 **Observabilité = un fichier texte.** · Preuve : tout passe par `collect.log` (`console.log`/`warn`, 8 occurrences). Aucune métrique, aucun historique structuré des runs en base. · Impact : impossible de répondre à « la source X décline-t-elle depuis 3 jours ? » sans grep manuel. · Correctif : table `collecte_runs` (source, recus, ecrits, duree, erreur, ts) ; le dashboard de santé devient une requête. · Effort : M.
- 🟡 **`maxDuration=300` sur la route cron mais collecte ≈ 2 h.** · Preuve : `api/cron/collect/route.ts:14`. · Impact : sur tout hébergeur à timeout HTTP, le complet via HTTP échouerait. En pratique le cron passe par `npm run collect` (CLI), donc la route HTTP est un vestige semi-trompeur. · Correctif : documenter que la route HTTP ne sert qu'au léger/express, ou la retirer. · Effort : S.

### C. Modèle de données & Drizzle — 6/10

- 🔴 **`pays` NULL sur 56 % du catalogue.** · Preuve : `select count(*) filter (where pays is null)` = 1262/2266 ; ventilation : `ats` 863 (Greenhouse ne renvoie que la ville — `ats/index.ts:131` `pays: null`), `gamejobs-co` 135, `work-with-indies` 100, `remoteok` 46… · Impact : le filtre géo « premier plan » est aveugle sur la moitié des offres ; une offre sans pays est invisible dès qu'on filtre par pays. · Correctif : déduire le pays depuis la ville (table ville→pays, ou géocodage léger) ; pour les boards remote, défaut « Remote/Monde ». · Effort : M.
- 🟠 **Aucun index GIN sur `logiciels`/`specialites`.** · Preuve : `pg_indexes` ne liste que des btree (pkey, unique, publie_le, pertinence, cle_dedup). Or les facettes font `unnest()` + `count(distinct)` et les filtres un `@>` (`offres-repo.ts:98,238`). · Impact : OK à 2266 lignes, scans séquentiels à x10–x100. · Correctif : `CREATE INDEX … USING gin (logiciels)`, idem specialites. · Effort : S.
- 🟠 **Recherche plein-texte = `ILIKE '%…%'`.** · Preuve : `offres-repo.ts:102-109`. · Impact : non-sargable (jamais d'index utilisable), pas de pertinence, pas de stemming — contredit la raison d'être affichée de Postgres. · Correctif : colonne `tsvector` générée (titre+studio+description) + index GIN + `websearch_to_tsquery` ; repli `ILIKE` pour les sous-chaînes courtes. · Effort : M.
- 🟡 **Taxonomie figée dans le code.** · Preuve : logiciels/spécialités/ROME sont des littéraux TS (`enrichir.ts`, `secteur-actif.ts`). · Impact : cohérent avec « secteur = config » (bon choix), mais empêche tout réglage sans redéploiement et tout enrichissement piloté par la donnée. · Correctif : acceptable à ce stade ; ne migrer en table que si un 2ᵉ secteur arrive. · Effort : L (à ne PAS faire maintenant — cf. §9).
- 🟡 **`latitude`/`longitude` morts.** · Preuve : 430 lignes peuplées, aucune requête/affichage. · Impact : dette silencieuse, fausse impression de capacité géo. · Correctif : soit les exploiter (carte/rayon), soit les retirer du schéma. · Effort : S.

### D. Frontend & UX/UI — 6/10

- 🟠 **Le filtre pays expose son propre trou.** · Preuve : `listerPays` ignore les pays NULL (`offres-repo.ts:217`), donc 56 % des offres « disparaissent » du sélecteur de pays sans explication. · Impact : utilisateur qui filtre « France » perd toutes les offres FR mal géolocalisées. · Correctif : option explicite « Lieu non précisé (n) » + correction donnée (C). · Effort : S.
- 🟡 **Zéro interactivité ; chaque filtre = rechargement complet + 5 requêtes.** · Preuve : `barre-filtres.tsx` `<form method=get>`, `page.tsx:76` `Promise.all` de 5 requêtes par rendu. · Impact : robuste et partageable (bon), mais expérience datée (pas de mise à jour live des facettes, pas de multi-sélection). · Correctif : garder le SSR + URL, ajouter une couche d'interactivité progressive (RSC + `useOptimistic`/`nuqs`) plus tard. · Effort : M.
- 🟡 **États vides/erreur pauvres.** · Preuve : un seul état vide générique (`page.tsx:107`) ; aucune frontière d'erreur (`error.tsx` absent), aucun `loading.tsx`. · Impact : une panne DB = page 500 brute. · Correctif : `error.tsx` + `loading.tsx` (skeleton), messages d'état contextualisés. · Effort : S.
- 🟡 **a11y correcte mais incomplète.** · Preuve : `aria-label` sur tous les selects, `<article>`/`<h3>`, focus-ring Tailwind — bon. Manque : pas de `<main>`/landmarks, pas de skip-link, comptes de facettes non annoncés aux lecteurs d'écran, contrastes zinc-600 sur zinc-950 à vérifier (pied de page). · Impact : utilisable au clavier, perfectible. · Correctif : landmarks + skip-link + audit contraste. · Effort : S.
- 🟠 **Des sources entières sont ensevelies par le tri fraîcheur.** · Preuve : le tri est `publie_le desc nulls last` (`offres-repo.ts:148`) ; or `publie_le` est **NULL pour 100 %** des offres de `indeed` (35), `gracklehq` (30), `remote-game-jobs` (33) et `awn` (9) — soit 107 offres qui tombent **systématiquement en bas** du flux, quelle que soit leur fraîcheur réelle (`recupere_le` ne sert qu'en cas d'égalité de `publie_le`, donc jamais départagé ici). · Impact : la promesse « scan rapide trié par fraîcheur » (UC-1) ment pour ~4 sources ; une offre fraîche scrapée hier de RemoteGameJobs est invisible sous 500 offres plus haut. · Correctif : trier sur `coalesce(publie_le, recupere_le)` (les connecteurs sans date fiable remontent à leur date de collecte). · Effort : S.

### E. Qualité de code & TypeScript — 8/10

- ✅ **Excellent.** `tsconfig` strict, **0** `any`/`as any`/`@ts-ignore`/`TODO`/`FIXME` dans `src/` (grep), Zod sur chaque source, pipeline pur sans dépendance DB, nommage cohérent (kebab fichiers, FR métier), commentaires denses et *justes*. 6042 lignes maîtrisées.
- 🟡 **Duplication du try/catch par connecteur.** · Preuve : `collect.ts` répète 19× le même bloc `try { fetch→normalize→traiter→upsert } catch { rapport erreur }`. · Impact : ~340 lignes répétitives ; ajouter une source = copier-coller. · Correctif : un `collecteur(nom, fetch, normalize, opts)` générique. · Effort : S.
- 🟡 **Prolifération de `.md` — globalement vivante, mais quelques cimetières.** · Preuve : 16 `.md` racine. `DECISIONS.md` (33 ADR, 59 Ko) et `HANDOFF.md` sont **vivants et précieux**. En revanche `RD-LINKEDIN.md` (piste interdite), `RD-TRI.md` (déjà implémenté) sont des notes figées ; `CLAUDE.md §8` ment sur l'état. · Impact : un nouvel arrivant (ou Claude lui-même) peut se fier à une carte périmée. · Correctif : déplacer les RD-* clos dans `docs/archive/`, corriger CLAUDE.md §3/§8. · Effort : S.

### F. Tests & Fiabilité — 6/10

- 🟠 **La requête la plus complexe n'a aucun test.** · Preuve : `tests/` couvre pipeline pur (classer, dedup, enrichir, purge, surveillance, traiter) + 19 `normalize` + `url`. **Rien** sur `offres-repo.ts` — or c'est là que vit la CTE `row_number() partition by cle_dedup` (`offres-repo.ts:129-150`), la facette `unnest`, le tri `nulls last`. · Impact : une régression sur la dédup/pagination passe inaperçue (pas de filet). · Correctif : tests d'intégration sur Postgres jetable (Testcontainers ou DB de test) couvrant dédup, comptes, facettes, pagination. · Effort : M.
- 🟠 **Connecteur Indeed intermittent en prod.** · Preuve : `collect.log` alterne deux états à quelques runs d'intervalle — `✓ indeed : 55 récupérées, 30 écrites` puis `✓ indeed : 0 récupérées, 0 écrites` et l'alerte `🟠 [indeed] 0 offre récupérée alors que 35 sont en base → connecteur probablement cassé`. C'est un anti-bot qui passe par à-coups, pas une panne franche. · Impact : la **flakiness** est en soi un problème de fiabilité (la surveillance « vide suspect » crie un faux positif un run sur deux, ce qui érode la confiance dans les alertes) ; le tout pour une source ToS-limite à faible densité. · Correctif : retirer Indeed (cf. G) — règle conformité **et** bruit d'alerte d'un coup. · Effort : S.
- 🟡 **Pas de test du chemin d'erreur réseau.** · Preuve : la résilience par source n'est testée qu'indirectement. · Correctif : tests mockés « fetch lève → rapport.erreur peuplé, autres sources OK ». · Effort : S.

### G. Sécurité & Conformité — 5/10

- 🟠 **Soumission communautaire : pilier RGPD promis, inexistant.** · Preuve : `CLAUDE.md §6`, `PRODUIT.md:19` en font la voie *légale* pour les annonces perso ; `grep` → 0 code. · Impact : soit la voie légale n'existe pas, soit (pire) des annonces perso entrent par le scraping sans le garde-fou « humain dans la boucle » annoncé. · Correctif : implémenter le formulaire + modération, OU retirer la promesse de la doc tant que non fait. · Effort : M.
- 🟠 **Scraping Indeed en violation ToS explicite + expédié en prod.** · Preuve : `indeed/index.ts:9` « Indeed interdit le scraping » — puis le scrape quand même via navigateur headless. · Impact : risque juridique/IP réel, pour une source cassée et à faible densité. · Correctif : supprimer le connecteur Indeed. · Effort : S.
- 🟡 **Pas de mentions légales / politique de confidentialité.** · Preuve : aucun fichier `legal`/`mentions` (`find`). · Impact : OK tant qu'aucune donnée perso n'est stockée, **mais** le jour des alertes email (Phase 2) c'est obligatoire — à anticiper. · Correctif : pages statiques avant toute collecte d'email. · Effort : S.
- ✅ **Bon par ailleurs** : secrets hors git (`.env.local` gitignore, vérifié absent de l'historique selon `.env.example`), route cron protégée par `Bearer CRON_SECRET` avec refus si secret absent (`route.ts:18`), pas de SSRF (slugs ATS et URLs codés en dur, pas d'entrée utilisateur dans les fetch), entrées dashboard validées contre des enums (`page.tsx:34`).
- 🟡 **Pas de rate-limit ni de robots.txt sur le dashboard public.** · Preuve : aucun `robots.txt`, aucune limite. · Impact : faible en LAN/mono-user ; à prévoir si exposition publique. · Effort : S.

### H. Performance & Scalabilité — 6/10

- ✅ Mono-user : 48 ms par page, 5 requêtes parallèles, build Turbopack 2,4 s. Rien à redire à l'échelle actuelle.
- 🟠 **Coût des facettes croît linéairement.** · Preuve : chaque rendu lance `listerLogiciels`+`listerSpecialites` (`unnest` + `count distinct` sur toute la vue) + `listerPays` + `compterParVue`, sans cache. · Impact : à x10–x100 offres, 5 agrégations plein-table par requête. · Correctif : index GIN (C) + cache court (`unstable_cache`/ISR 60 s) des facettes, qui changent lentement. · Effort : M.
- 🟡 **Pas de cache de page.** · Preuve : lecture DB à chaque requête (assumé « dashboard dynamique »). · Impact : acceptable mono-user ; gaspille du calcul si trafic. · Correctif : revalidation par tag invalidé après collecte. · Effort : M.

### I. DevOps & Déploiement — 5/10

- 🟠 **Aucune CI.** · Preuve : `.github/` vide. · Impact : build/lint/test (qui passent localement) ne sont *vérifiés par rien* avant un commit ; une régression entre en master sans filet. · Correctif : workflow GitHub Actions `install→lint→test→build` sur push/PR (le remote `origin = RenderJobs` existe déjà, cf. dernier commit). · Effort : S.
- 🟠 **Aucune sauvegarde de CETTE base — confirmé.** · Preuve : `systemctl list-timers` montre des backups pour d'autres apps ; vérification de chaque service (`333fm-pgbackup` dumpe `pg_dump -U fm333 333fm` dans un conteneur Docker, etc.) — **aucun ne couvre** le Postgres du projet sur le port 5434. `grep 5434|clara` sur tous les `*backup*` : rien. · Impact : 2266 offres + tout l'état reconstruit par collecte, donc perte tolérable aujourd'hui — mais dès qu'il y aura de l'état *utilisateur* (candidatures suivies), la perte sera **irréversible**. · Correctif : timer `pg_dump` quotidien de la base du projet (port 5434). · Effort : S.
- 🟡 **Migrations prod par `db:push`.** · Preuve : `package.json` expose `db:push` (diff direct) et `db:migrate` ; 3 migrations versionnées existent. · Impact : `push` en prod = risque de divergence schéma silencieuse. · Correctif : figer sur `db:migrate` (migrations versionnées) en prod. · Effort : S.
- 🟡 **Redéploiement manuel.** · Preuve : `deploy/README` « après modif code → `npm run build` + `systemctl restart` à la main ». · Impact : oubli possible (le code servi est le build). · Correctif : hook post-merge ou petit script `deploy.sh`. · Effort : S.

---

## 6. Vision & Innovations — comment passer d'agrégateur à copilote

Le commanditaire a **raison** : le projet sous-exploite sa propre matière. Il a déjà la chose
difficile (une base propre, enrichie, dédupliquée, fraîche). Il lui manque la couche qui *agit sur*
cette matière. Voici ma recommandation tranchée, du plus rentable au plus visionnaire.

**Ma conviction n°1 — ce projet doit cesser d'ajouter des sources.** La collecte est *finie* et
excellente (19 sources, dédup, surveillance). Chaque nouvelle source a un rendement décroissant et
ajoute de la dette. Les 15 semaines doivent aller à **100 %** vers l'utilisateur.

### Le manque qui crève les yeux (que personne dans le projet n'a traité)
L'outil ne connaît **rien** de son unique utilisatrice. Il n'a pas son métier (character artist ?
gameplay programmer ?), ni ses logiciels (Maya ? Unreal ?), ni son niveau, ni les offres qu'elle a
déjà vues/postulées. Or **toute cette information existe déjà comme dimensions sur les offres**
(`logiciels`, `specialites`, `experience`). Il suffit de la retourner : décrire l'utilisatrice
*dans le même langage que les offres*, et tout devient possible (matching, scoring, alertes ciblées)
**sans modèle ML** — juste de l'intersection d'ensembles sur des données qu'on produit déjà.

### Réaliste à 15 semaines (à faire)
1. **Profil local (sans compte)** — un panneau « Mon profil » stocké en `localStorage` : métiers,
   logiciels maîtrisés, niveau, pays, mode souhaité. Zéro backend, zéro RGPD. *La clé de voûte de tout le reste.*
2. **Scoring « pourquoi cette offre te correspond »** — score = recouvrement {logiciels, spécialité,
   niveau, géo} profil↔offre. Affiché sur la carte (« 4/5 : Maya, rigging, junior, France ») + tri
   « pertinence pour moi ». Pur calcul, déterministe, testable. **C'est le vrai différenciateur.**
3. **Suivi de candidatures** — état par offre (vu / à postuler / postulé / relancé / refusé), en base
   (ou local d'abord). Transforme l'agrégateur en *espace de travail*. C'est *le* verbe manquant.
4. **« Nouveau depuis ta dernière visite »** — badge sur les offres dont `recupere_le` > dernier
   passage. Tient enfin la promesse « être le premier sur le vraiment nouveau ». Trivial (cookie).
5. **Alerte ciblée** — une recherche sauvegardée (mes filtres + mon profil) → e-mail/Discord quand une
   offre matche. Réutilise la surveillance et le webhook déjà en place. (Implique mentions légales si email.)
6. **Réparer la fondation données géo** (pays NULL) — sans quoi le matching géo et le filtre pays mentent.

### Visionnaire (cadrer, pas forcément livrer à 15 semaines)
- **Ranking sémantique par embeddings** — encoder titre+description et la requête/profil, classer par
  similarité cosinus. Remplace l'`ILIKE` naïf par de la vraie pertinence, et rend le matching robuste
  aux intitulés exotiques. Réaliste techniquement (pgvector + un modèle d'embedding), mais à ne lancer
  qu'après le socle profil/scoring déterministe (qui couvre 80 % du besoin pour 20 % de l'effort).
- **Intel salaires/tendances** — seulement 9 % des offres ont un salaire : trop peu pour des stats
  fiables. À documenter comme limite, pas à survendre.
- **Aide candidature ciblée** (CV/lettre orientés offre via LLM) — fort potentiel, mais hors du cœur
  « trouver l'offre » ; à garder en Phase 3.

### Angles morts identifiés
- **La donnée géo cassée invalide silencieusement un filtre vendu comme central.**
- **Le projet optimise la collecte (résolue) au détriment de l'usage (vierge).**
- **Aucune connaissance de l'utilisatrice** alors que le schéma d'offre *est déjà* le vocabulaire d'un profil.
- **L'état utilisateur (candidatures) n'a pas de sauvegarde** — le jour où il existera, il sera précieux et fragile.

---

## 7. Roadmap 10–15 semaines

Priorisée par impact/effort. Chaque jalon référence un finding (§5) ou une innovation (§6).

### P0 — Stabilisation (Semaines 1–2) · *« ça doit cesser de saigner »*
- **CI GitHub Actions** install→lint→test→build (finding I). *Done =* PR rouge si un test casse.
- **Réparer la donnée pays** : ville→pays + défaut « Remote » pour boards distants (findings C, D, A). *Done =* pays NULL < 10 %.
- **Index GIN** logiciels/specialites + `db:migrate` figé en prod (findings C, I). *Done =* facettes sur index.
- **Supprimer Indeed** (findings F, G). **Sauvegarde `pg_dump` quotidienne** de la base (finding I).
- **Corriger la doc** CLAUDE.md §3/§8, archiver les RD-* clos (finding E). *Done =* la doc décrit la réalité.
- Dépendances : aucune. Quick, déblocant.

### P1 — Socle « connaissance de l'utilisatrice » (Semaines 3–6) · *fondation de tout le reste*
- **Profil local** (innovation 1) — panneau localStorage. *Done =* profil persistant sans compte.
- **Scoring de correspondance + tri « pour moi »** (innovation 2). *Done =* score visible + testé unitairement (calcul pur).
- **error.tsx / loading.tsx + états enrichis** (finding D). 
- **Tests d'intégration `offres-repo`** sur Postgres jetable (finding F) — *prérequis* avant d'ajouter des features qui touchent la lecture.
- Dépendances : profil avant scoring ; tests-repo avant P2.

### P2 — Outil actif (Semaines 7–11) · *le palier produit*
- **Suivi de candidatures** (innovation 3) — état par offre, en base. *Done =* changer un statut persiste et filtre.
- **« Nouveau depuis ta dernière visite »** (innovation 4). *Done =* badge fiable.
- **Recherche FTS Postgres** (`tsvector`) en remplacement de l'ILIKE (finding C). *Done =* recherche pertinente et indexée.
- **Cache facettes + revalidation post-collecte** (finding H). 
- **Collecte concurrente** (finding B) + **table `collecte_runs`** (observabilité, finding B).
- Dépendances : suivi candidatures impose la sauvegarde DB (P0) et les tests-repo (P1).

### P3 — Différenciation (Semaines 12–15) · *ce qui rend l'outil enviable*
- **Alertes ciblées** (innovation 5) + mentions légales (finding G). *Done =* une recherche sauvegardée notifie.
- **Pondération marché FR / filtre langue exposé** (finding A) + sources FR déjà cartographiées (WTTJ, studios FR) **uniquement si** le temps le permet.
- **Préparer (POC) le ranking par embeddings/pgvector** (vision) — cadrage + spike, pas forcément en prod.
- Dépendances : profil (P1) pour cibler les alertes.

---

## 8. Quick wins (< 1 jour chacun)

1. **Supprimer le connecteur Indeed** (intermittent + ToS) — retirer de `collect.ts` + dossier. *(G, F)*
2. **Index GIN** sur `logiciels` et `specialites` — une migration. *(C, H)*
3. **`error.tsx` + `loading.tsx`** à la racine de l'app. *(D)*
4. **Corriger `CLAUDE.md §3` (Vercel→auto-hébergé) et §8 (Phase réelle)** + bandeau « état » à jour. *(E, doc)*
5. **CI minimale** : un workflow Actions `lint && test && build`. *(I)*
6. **Option « Lieu non précisé (n) »** dans la facette pays (rend visibles les 56 % NULL). *(D)*
7. **Timer `pg_dump` quotidien** de la base du projet. *(I)*
8. **Factoriser le try/catch des 19 connecteurs** en un helper `collecteur()`. *(E)*
9. **Figer la prod sur `db:migrate`** (retirer `db:push` du flux de déploiement). *(I)*
10. **Badge « nouveau »** (cookie `derniereVisite` vs `recupere_le`) — 80 % de la rétention pour quasi rien. *(A)*
11. **Tri `coalesce(publie_le, recupere_le)`** (`offres-repo.ts:148`) — une ligne, dés-ensevelit 107 offres (4 sources) du bas du flux. *(D)*

---

## 9. Ce que tu NE recommandes PAS (pièges & sur-ingénierie)

1. **N'ajoute pas de sources.** La collecte est résolue. Toute énergie sur une 20ᵉ source est volée
   à l'utilisateur. (Garde la carte des sources comme réserve, n'y touche pas.)
2. **Ne migre pas la taxonomie (logiciels/spécialités) en base maintenant.** « Secteur = config » en
   TS est le bon choix tant qu'il n'y a qu'un secteur et une utilisatrice. Le faire = semaines perdues
   pour zéro bénéfice utilisateur.
3. **Ne saute pas aux embeddings/LLM avant le scoring déterministe.** Le matching par intersection
   d'ensembles (profil↔offre) couvre l'essentiel pour un effort minime ; pgvector ne se justifie
   qu'ensuite. Commencer par l'IA ici, c'est de la sur-ingénierie.
4. **Ne construis pas de comptes/multi-user.** Le scope mono-user est un *atout* : il supprime auth,
   RGPD lourd, et permet le `localStorage`. Ne le casse pas par anticipation.
5. **Ne remplace pas le SSR + état-URL par une SPA cliente.** L'architecture actuelle (RSC, filtres
   dans l'URL, partageable) est saine. Ajoute de l'interactivité *progressivement*, ne réécris pas.
6. **Ne sur-investis pas l'intel salaires** (9 % de couverture) ni l'aide CV/LLM avant que le cœur
   « trouver + suivre » soit livré. Ce sont des features de vitrine, pas de fondation.
7. **Ne garde pas Indeed/LinkedIn « au cas où ».** La zone grise ToS est un risque réel pour un gain
   nul. La soumission communautaire est la bonne réponse — implémente-la plutôt.

---

*Fin de l'audit. Le projet n'a pas un problème d'exécution technique — il en a une qualité
inhabituelle. Il a un problème d'ambition arrêtée trop tôt. Les 15 semaines doivent servir à
franchir la frontière entre « voir les offres » et « mener sa recherche ». La fondation le permet
déjà.*
