# R&D — Le tri (pertinence) à partir des signaux d'API

> Document de **recherche**, pas de code. Objectif : comprendre ce que **chaque API nous donne
> vraiment** pour fiabiliser le **tri de pertinence** (`coeur` / `connexe` / `hors_scope`, cf.
> `PRODUIT.md` R-1), aujourd'hui jugé « compliqué ». Données **sondées en réel le 2026-06-02**
> (FT + Adzuna avec clés ; RSS AFJV/Games-Career ; ATS Greenhouse/Lever/Ashby ouverts).
> Compagnon de `SOURCES.md` (carte des sources) et `DECISIONS.md` (ADR-0011 = pipeline de tri).

---

## 1. Le problème, formulé précisément

**Le tri actuel est 100 % textuel.** `enrichir.ts` + `classer.ts` passent des **regex de lexiques**
(logiciels, vocabulaire métier, bruit) sur `titre + description`, puis décident la pertinence.

Or **on collecte par taxonomie** (codes ROME côté FT, phrases métier côté Adzuna) **mais on jette
les signaux structurés au `normalize()`** : le `romeCode`, la catégorie Adzuna, la catégorie métier
AFJV, le département ATS… n'arrivent jamais jusqu'au classifieur. Résultat : on **re-devine** depuis
le texte brut une information que la source nous **donnait déjà proprement**.

➡️ **Thèse de cette R&D** : le tri doit être **en couches**, *signaux structurés d'abord*, *texte en
dernier recours*. Le texte ne doit servir qu'à **affiner** (spécialités, logiciels), pas à porter
seul la décision cœur/bruit.

---

## 2. Inventaire par API — ce qui est exploitable pour le tri

Légende verdict : 🟢 signal fort · 🟡 signal partiel/contextuel · 🔴 inexploitable ou trompeur.

### 2.1 France Travail (API Offres v2) — la plus riche en structuré

Champs réellement renvoyés par offre (sondés sur `M1831`, `E1205`) :

| Champ | Exemple | Verdict tri | Remarque |
|---|---|---|---|
| `romeCode` + `romeLibelle` | `M1831` / « Développeur jeux vidéo » | 🟢 **fort** | **On filtre dessus mais on ne le stocke pas.** Meilleur signal cœur dispo. |
| `appellationlibelle` | « Programmeur gameplay » | 🟢 fort | Intitulé **normalisé** (taxonomie), plus fiable que le titre libre. |
| `formations[].domaineLibelle` | « Jeu vidéo » | 🟢 fort | Domaine de formation exigé = secteur visé, très discriminant. |
| `experienceLibelle` / `experienceExige` | « 10 An(s) » / `E` | 🟢 fort | **Niveau structuré** → meilleur que la regex junior/senior. |
| `typeContrat` (+ `dureeTravailLibelleConverti`) | `CDI` / « Temps plein » | 🟢 fort | Déjà mappé ; `alternance` est un **booléen** dédié. |
| `langues[]` | « Anglais (exigé) » | 🟡 | Langue **exigée**, pas la langue de l'annonce. |
| `qualificationLibelle` | « Cadre » | 🟡 | Cadre/non-cadre → indice de séniorité. |
| `secteurActiviteLibelle` / `codeNAF` | « Programmation informatique » / `62.01Z` | 🔴 **trompeur** | Voir piège §4. Beaucoup d'**agences d'intérim/placement** + 31 % d'**absents** sur E1205 → masque l'employeur réel. |

**Référentiels** (toutes API FT activées) : `typesContrats` (12), `niveauxFormations` (11),
`natureContrats`, communes, ROME/appellations… → tables de vérité pour **normaliser sans deviner**.

**Conclusion FT** : `romeCode` + `appellation` + `domaine de formation` + `experience` sont des
signaux **directs** qu'on devrait **stocker et utiliser** ; le NAF est à **ignorer** pour le tri.

### 2.2 Adzuna — catégorie grossière

- **Taxonomie `/categories`** : 30 catégories **larges** (`it-jobs`, `creative-design-jobs`,
  `engineering-jobs`, `teaching-jobs`…). Pas de niveau « jeu vidéo » / « VFX ».
- **Test réel** (`game developer`, gb, 50 résultats) : 28 *IT Jobs*, **10 *Teaching Jobs***, 7
  *Creative & Design*, 2 *Sales*… Notre secteur **chevauche it-jobs + creative-design**, et la
  catégorie laisse passer du bruit (Teaching = cours de game dev).
- Exemple : un « 3D Artist » de **DFS (meubles)** classé `pr-advertising-marketing-jobs`.

**Verdict** : 🟡 **filtre négatif utile** (exclure `teaching/sales/retail/hospitality/healthcare…`)
mais **🔴 mauvais signal positif** (ne prouve pas qu'on est dans le secteur). Le texte reste
nécessaire côté Adzuna ; la catégorie sert de **garde-fou** (et `category=` peut **borner la requête**).

### 2.3 AFJV (RSS) — catégorie métier curée

Item réel : 3 `<category>` = **contrat** (`Freelance`) + **pays** (`France`) + **famille métier**
(`Support / CM`). On ne lit aujourd'hui que les deux premières.

**Verdict** : 🟢 la **famille métier** est une taxonomie **interne au secteur** (AFJV = 100 % jeu
vidéo) → cadeau pour la **spécialité** et confirme le cœur. À **capter** (3ᵉ catégorie).

### 2.4 Games-Career (RSS) — pas de catégorie, mais matière riche

Item réel : titre `<Studio>: <Rôle>`, `content:encoded` = **description HTML complète**, **pas de
`<category>`**. Source curée (100 % jeu vidéo, EU/EN).

**Verdict** : 🟡 pas de taxonomie → s'appuyer sur le **rôle dans le titre** + le **texte riche**
(`content:encoded`) pour la spécialité. Le **plancher de source** (curée → `connexe` mini) porte la pertinence.

### 2.5 ATS publics (Greenhouse / Lever / Ashby) — pertinence par l'employeur

Sondes réelles :
- **Greenhouse / Riot** (185 postes) : `departments[]` (« VALORANT Studio », « Riot Technology »,
  mais aussi « Finance & Strategy », « People », « Legal »), `location`, `metadata[]`, `language`.
- **Lever / Voodoo** (34 postes) : `categories: { team, department, commitment, location }`
  (« Live - Studios », « Growth », mais aussi « **Sales** », « CEO Staff »).
- **Ashby / (test)** : `department`, `team`, `employmentType`, `workplaceType` (Hybrid/Remote),
  `location`, `descriptionHtml/Plain` — très propre.

**Constat clé** : un studio = **100 % « industrie du jeu »** mais **PAS 100 % « métier créatif »** :
il y a des postes **corporate** (Sales, HR/People, Finance, Legal). Le signal de tri n'est donc pas
« la source » seule, c'est le **`department`/`team`**.

**Verdict** : 🟢🟢 le plus fort. Modèle proposé : **plancher `connexe`** (studio connu) + **`department`
→ cœur** si craft (Art/Engineering/Design/Animation/QA) / **reste `connexe`** si corporate
(Finance/People/Legal/Sales). ⚠️ Les noms de départements sont **libres, non standardisés** entre
studios → mapping par **mots-clés sur le département** (pas une table figée), à maintenir petit.

---

## 3. Synthèse — quel signal porte le tri, par source

| Source | Signal structuré le + fort | Force | Rôle dans le tri |
|---|---|---|---|
| France Travail | `romeCode` + `appellation` + `domaine formation` | 🟢 | **Porte le cœur** (déjà ciblé à la collecte) |
| ATS (GH/Lever/Ashby) | `department` / `team` (+ studio connu) | 🟢🟢 | Plancher `connexe` + craft→`coeur` |
| AFJV | `<category>` métier | 🟢 | Confirme cœur + donne la spécialité |
| Adzuna | `category` (large) | 🟡/🔴 | **Filtre négatif** + texte pour le positif |
| Games-Career | rôle (titre) + texte riche | 🟡 | Plancher source + texte |

**Le texte (regex actuelles) devient un *fallback*** : utile quand aucun signal structuré n'existe
(Adzuna positif, Games-Career), et pour **enrichir** (logiciels/spécialités) — jamais le seul juge.

---

## 4. Pièges & limites (constats honnêtes)

- **FT — NAF/secteur trompeur** : sur ROME `E1205`, 47/150 offres **sans secteur**, et 45/150 portées
  par des **agences d'intérim/placement** (le NAF = l'agence, pas le studio). → **ne pas** trier sur le NAF.
- **Adzuna — catégorie grossière** : ne distingue pas « jeu vidéo » du reste de l'IT ; à n'utiliser qu'en négatif.
- **ATS — départements non standardisés** : « Riot Technology » vs « Engineering » vs « Tech » → mapping
  par mots-clés, jamais une énumération figée ; prévoir un défaut prudent (`connexe`) si inconnu.
- **ATS — couverture = liste de studios** : il faut une **liste curée** de slugs (cf. `SOURCES.md` Tier 1bis) ;
  silence = studio absent de la liste, pas « rien ne recrute ».
- **Trou de recall** (rappel, cf. mémoire `recall-trou-collecte-connexe`) : la collecte par filtre (ROME/phrases)
  loupe des métiers non listés → à patcher via le flux **Connexe**, indépendant de ce tri.
- **Cohérence cross-source** : `romeCode` (FT), `category` (Adzuna), `department` (ATS), `<category>` (AFJV)
  sont **4 taxonomies différentes** → ne pas les fusionner ; chaque connecteur **mappe vers nos** `pertinence`/`specialites`.

---

## 5. Pistes d'action (à décider/coder plus tard — PAS dans cette R&D)

1. **Modèle** : transporter les signaux structurés jusqu'au classifieur. Options à trancher —
   soit des champs dédiés sur `Offre` (ex. `romeCode`, `categorieSource`, `departementSource`),
   soit un sac `signaux: Record<string,string>` rempli par chaque `normalize()`. (Décision d'archi à acter en ADR.)
2. **Classifieur en couches** : (a) plancher de source (déjà là via `traiter`) ; (b) **règles sur
   signaux structurés** (romeCode cœur, department craft, category Adzuna négative) ; (c) **texte** en fallback.
3. **Mappings à construire** (petits, testables, pilotés par la config de secteur) :
   - codes ROME → `coeur`/`connexe` (on les a déjà ; juste les **classer**) ;
   - mots-clés département ATS craft vs corporate ;
   - catégories Adzuna **exclues** (teaching, sales, retail, hospitality, healthcare, legal, admin…).
4. **Capter ce qu'on jette** : 3ᵉ `<category>` AFJV (spécialité), `appellationlibelle` + `experienceLibelle`
   + `formations[].domaineLibelle` FT, `category` Adzuna, `department`/`team` ATS.
5. **Sondes complémentaires à faire** : distribution des `department` sur plusieurs studios ATS
   (construire le mapping craft/corporate sur données réelles) ; liste des catégories Adzuna par pays
   (FR/US identiques ?) ; vérifier la stabilité des libellés ROME entre versions.

---

## 5bis. Deep-dive ATS — validation sur données réelles (2026-06-02)

Sondage des **23 studios** de la liste-amorce (`SOURCES.md` Tier 1bis) sur Greenhouse/Lever/Ashby :
**1102 postes** récoltés, **141 libellés** de département/équipe distincts.

**Constat n°1 — beaucoup de « départements » ne sont PAS des métiers** : ce sont des **noms de
studio/produit** (« MonopolyGo » 50, « Live Games Portfolio » 45, « Riot Discovery Studio » 30,
« League Studio » 25, « VALORANT Studio », « Niantic »…). Un mapping département→métier ne peut donc
**pas** être exhaustif ; il faut un **défaut prudent**.

**Constat n°2 — deux blocs nets émergent** :
- **Craft** (→ promouvoir `coeur`) : « Software Engineering » 113, « Art » 38, « General Design » 27,
  « Engineering Specialist » 28, « Machine Learning » 19, « Data Science » 15, « Production » 12,
  « Tools » 9, « UI/UX » 7, « Online Services » 25, « Core Tech »…
- **Corporate** (→ garder `connexe`) : « People » 21, « Legal » 16, « Finance » 12, « Marketing » 7,
  « Publishing » 25, « Operations » 11, « Growth » 10, « Product Management » 16, « Counsel », « Public Policy ».

**Validation d'un mapping par mots-clés** (sur le libellé + titre), appliqué au corpus réel :

| Bucket | Part | Lecture |
|---|---|---|
| **craft → `coeur`** | **69 %** | identifié déterministe (engineering, art, design, production…) |
| **corporate → `connexe`** | **14 %** | identifié déterministe (people, legal, finance, sales…) |
| **défaut → `connexe`** | **16 %** | non identifiable (noms de studio/produit) → prudent, jamais perdu |

➡️ **83 % des postes ATS se classent sans toucher au texte de l'annonce.** Le reste tombe proprement
en `connexe` (R-1 respecté). C'est la démonstration que **le tri ATS peut être quasi déterministe**.

**Mapping proposé (à coder plus tard, piloté par config)** :
- craft : `engineer|software|developer|programming|code|tools|art|animation|design|gameplay|level|vfx|fx|audio|sound|graphics|render|ui|ux|technical art|production|qa|quality|narrative|writer|cinematic|3d|data science|machine learning|online services|core tech`
- corporate : `people|hr|human resources|talent|recruit|legal|counsel|finance|accounting|marketing|sales|communications|pr|public policy|business|admin|facilities|safety|customer|support|growth|strategy|partnership|procurement|compliance`
- défaut (rien ne matche) : `connexe` (studio connu = plancher de confiance).

**Bonus — types d'engagement ATS** (pour `mapContrat` du futur connecteur) : `FullTime`/`Permanent`
dominent ; présents aussi `Internship` (→ stage), `Contractor`/`Contract` (→ freelance/CDD),
`Fixed Term`/`Temporary` (→ CDD). ⚠️ `FullTime` = **durée**, pas type de contrat → ne pas confondre.

**Couverture observée** (postes au sondage) : roblox 251, scopely 202, riotgames 185, epicgames 124,
rockstargames 79, discord 71, supercell 46, voodoo 34, thatgamecompany 25, avalanchestudios 18,
kabam 15, naughtydog 11… → **un connecteur générique ATS + liste de slugs = ~1100 offres quasi 100 %
pertinentes**, à comparer aux 12 cœur de FT. C'est le **meilleur levier cœur** du projet.

## 5ter. Panorama ATS étendu — SmartRecruiters & goulot de couverture (2026-06-02)

**Découverte de nouveaux studios par devinette de slug** : 84 candidats testés sur GH/Lever/Ashby →
**5 nouveaux** seulement (`larian`/lever=72, `krafton`/gh=59, `bandainamco`/gh=8, `gearbox`/gh=1,
`crystaldynamics`/gh=1). **Taux faible assumé** : les **AAA ne sont pas sur ces ATS publics** (Workday/
Taleo/SmartRecruiters), et le **vrai slug diffère du nom** → le **goulot de couverture, c'est la
découverte des slugs**, pas l'API. Implication : il faut une **méthode de découverte** (liste curée type
*gameindustrycareerguide*, ou empreinte ATS détectée sur les pages carrières), pas du brute-force.

**SmartRecruiters = 6ᵉ ATS, et le meilleur pour le tri.** Hits réels : **Gameloft = 80**, **Keywords
Studios = 29** (Ubisoft/SEGA/SquareEnix/Sony répondent mais **0 posting public** → ailleurs/Workday).
Contrairement aux autres, SmartRecruiters expose une **taxonomie STANDARDISÉE** par poste :

| Champ SmartRecruiters | Exemple | Intérêt tri |
|---|---|---|
| `function` | « Art/Creative », « Production », « Engineering », « Design » | 🟢🟢 **standardisé** (≠ texte libre GH) → mapping direct |
| `industry` | « Entertainment » | 🟢 signal secteur de l'employeur |
| `experienceLevel` | « Mid-Senior Level » | 🟢 niveau structuré |
| `typeOfEmployment` | « Full-time » / permanent | 🟢 contrat |
| `location.remote` / `.hybrid` | booléens | 🟢 mode de travail **sans regex** |

→ Gameloft par `function` : Art/Creative 27, Production 14, IT 13, Design 4, Engineering 3 = quasi tout craft.

**Hiérarchie des signaux ATS pour le tri** : SmartRecruiters (`function` standardisé) > GH/Lever/Ashby
(`department`/`team` **texte libre** → mapping mots-clés du §5bis). Le futur connecteur générique ATS
devrait **préférer le champ standardisé quand il existe**, sinon retomber sur le mapping mots-clés.

## 5quater. Lien avec la vision (auto-apply + couche IA de tri)

Deux objectifs annoncés par la proprio, que cette R&D prépare :
- **Automatiser les candidatures** : les ATS (Greenhouse/Lever/SmartRecruiters) exposent aussi des
  **endpoints de candidature** structurés → ce sont le **substrat naturel de l'auto-apply** (à explorer
  séparément ; attention ToS/anti-spam). Raison de plus de prioriser les sources ATS.
- **Couche IA de tri** : le modèle en couches (structuré → texte) laisse une **zone grise** explicite —
  ~16 % des postes ATS « défaut→connexe », et le gros du flux Adzuna. **C'est exactement là qu'une couche
  IA est rentable** : laisser les **règles déterministes** trancher les 83 % évidents (gratuit, instantané)
  et **n'appeler le LLM que sur la zone grise/connexe** (volume réduit → coût maîtrisé). Le `connexe` n'est
  donc pas un fourre-tout, c'est la **file d'attente de l'IA**.

## 6. À retenir en une phrase

**Les API sont bonnes parce qu'elles sont déjà structurées** : le tri est « compliqué » surtout
parce qu'on **jette ce structuré** et qu'on rejoue tout au texte. Récupérer `romeCode` (FT),
`department` (ATS), `<category>` (AFJV) et utiliser `category` Adzuna en filtre négatif transforme
le tri d'un problème d'**heuristique de texte** en un problème de **mapping de taxonomies** — plus
fiable, plus testable, et fidèle à R-1 (« on ne perd jamais une vraie offre »).
