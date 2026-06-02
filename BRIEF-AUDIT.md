# Brief d'audit — Hub d'Emploi 3D & Jeu Vidéo

> Document de cadrage destiné à un **auditeur externe**. Objectif : décrire **la promesse** du produit
> et **comment elle est exécutée** (logique + structure), sans détail de code. Sert de base à un audit
> de cohérence « promesse ↔ réalisation ».

---

## 1. La promesse (ce que le produit s'engage à faire)

**Centraliser, en un seul endroit, toutes les offres d'emploi du secteur 3D / jeu vidéo / animation /
VFX / cinématique.** L'utilisateur voit tout d'un coup, **filtre finement** (métier, logiciel, spécialité,
niveau, lieu), et clique pour **postuler directement sur la source d'origine**.

**Différenciateur central** : des **filtres que les généralistes n'ont pas** — notamment **logiciel**
(Maya, Unreal, Houdini…), **spécialité** (rigging, VFX, level design…) et **niveau** — qui ne sont pas
fournis par les sources mais **déduits automatiquement** du texte des annonces.

**Principes non négociables (la « charte ») :**
- **Sans compte, sans friction** : aucune inscription pour consulter/filtrer.
- **Redirection directe** : on renvoie vers l'annonce d'origine pour postuler (on n'intermédie pas).
- **Attribution systématique** : chaque offre affiche sa source + le lien d'origine.
- **Fraîcheur** : offres récentes, rafraîchies régulièrement ; les offres mortes disparaissent.
- **Niche assumée** : qualité/pertinence du secteur plutôt que volume généraliste.
- **On ne perd jamais une vraie offre** : le tri **organise l'affichage**, il ne **supprime** pas (cf. §3).
- **Conformité** : aucune collecte de **données personnelles** (posts perso de recruteurs) ; respect de
  l'attribution et des conditions des sources.

**Cibles & portée :**
- **Public n°1 : juniors / sorties d'école** (mise en avant stage/alternance/débutant).
- **International dès le départ** (France d'abord, puis Europe / US-UK), offres **dans leur langue d'origine**,
  interface en français mais conçue pour être traduisible.

---

## 2. L'expérience attendue (comportement produit)

- Un **tableau de bord** unique listant les offres, triées par **fraîcheur**.
- Deux niveaux de pertinence visibles : un **flux principal** (offres clairement du secteur) et un
  **onglet « connexes »** (offres proches/au doute — montrées, jamais jetées).
- Des **filtres** : métier/spécialité, logiciel, niveau d'expérience, type de contrat, **pays/lieu**, mode
  de travail (remote/hybride/présentiel).
- Chaque **carte d'offre** : intitulé, studio, lieu, étiquettes déduites (logiciels/spécialités/niveau),
  **source + lien d'origine**, date.
- **Aucun mur** : pas de login, pas de paywall, pas de formulaire pour voir/filtrer.

---

## 3. Comment c'est exécuté (chaîne logique, de la source à l'écran)

Le produit est une **chaîne de traitement** alimentée par de nombreuses sources, puis un affichage. Étapes :

1. **Collecte multi-sources.** Des « connecteurs » (un par source) récupèrent les offres. Chaque connecteur
   est **isolé** : si une source tombe, les autres continuent.
2. **Normalisation.** Chaque offre, quel que soit son format d'origine, est ramenée à un **format commun**
   et **validée** (les données mal formées sont rejetées plutôt que stockées corrompues).
3. **Enrichissement (annotation).** À partir du texte, le système **déduit** logiciels, spécialités, niveau,
   langue, mode de travail. Règle clé : l'enrichissement **annote, ne filtre jamais** (une offre sans
   étiquette reste affichée).
4. **Tri de pertinence « en couches ».** Chaque offre est classée en **cœur** / **connexe** / **hors-sujet**.
   Principe directeur : **s'appuyer d'abord sur les signaux structurés** fournis par les sources (catégorie
   métier officielle, département d'un studio, etc.) et n'utiliser le **texte** qu'en dernier recours. Le
   rejet (« hors-sujet ») est une **exception rare**, réservée au bruit indiscutable ; **au moindre doute,
   l'offre va en « connexe »** (montrée), jamais supprimée.
5. **Dédoublonnage inter-sources.** Une même offre présente sur plusieurs sources est regroupée (par
   signature studio + intitulé) pour ne pas s'afficher en double.
6. **Stockage & fraîcheur.** Les offres sont enregistrées (mise à jour si déjà connues) et les offres **non
   revues** lors de la dernière collecte sont **purgées** (offres expirées/pourvues).
7. **Affichage.** Le tableau de bord lit ces offres (flux cœur + onglet connexes), applique les filtres et
   affiche l'attribution.

**Principe structurel transverse — « moteur générique, secteur = configuration ».** Le moteur (collecte,
enrichissement, tri) **ne connaît pas** le métier « 3D/jeu vidéo » : la niche est un **paramètre de
configuration** isolé. Conséquence : on peut affiner le périmètre, voire viser un autre secteur, **sans
réécrire le moteur**. Le produit est pensé pour **monter en charge** (architecture propre dès le départ).

---

## 4. D'où viennent les offres (typologie des sources & posture)

Les offres du secteur sont **éparpillées** et mal servies par les canaux classiques. La stratégie est
**« API/flux officiels d'abord, scraping ensuite »**, par niveaux de risque croissant :
- **API & flux officiels** : API publique d'emploi nationale (France), agrégateur international, flux
  spécialisés du secteur (boards métier).
- **API publiques d'« ATS »** (logiciels de recrutement des studios) : on récupère les offres **directement
  chez les studios** — pertinence quasi totale.
- **Scraping de boards de niche** : sites sans API, récupérés de façon automatisée (posture assumée par la
  propriétaire pour atteindre la couverture « tout le secteur »).
- **Soumission communautaire** : pour les offres informelles / sources fermées, un humain soumet le lien.

**Lignes rouges & conformité (à auditer) :** pas de **données personnelles** (RGPD) ; **attribution**
toujours affichée ; on respecte par défaut les refus explicites des sites ; les sources hostiles ou dont
les conditions interdisent l'automatisation (ex. réseaux sociaux pros) sont **exclues de l'automatique** et
renvoyées vers la soumission communautaire.

---

## 5. État actuel (périmètre, pour calibrer l'audit)

- **Plusieurs sources sont déjà actives** (API nationale, agrégateur international, flux spécialisés,
  API d'ATS de studios, premiers boards scrapés), un **pipeline de tri/enrichissement** opérationnel, un
  **dédoublonnage**, une **collecte récurrente** (fraîcheur) et un **premier tableau de bord**.
- D'autres sources sont **cartographiées et prêtes à brancher** (documents de R&D dédiés par source).
- Le produit est en **phase de construction** (MVP fonctionnel, périmètre en extension continue).

---

## 6. Axes suggérés pour l'audit (« promesse ↔ exécution »)

Pour un audit logique **et** structurel, les points de tension connus / à challenger :
1. **« Toutes les offres » vs couverture réelle** : la collecte ciblée peut **manquer** des offres publiées
   sous un intitulé inattendu. Question : l'écart de couverture est-il maîtrisé et **récupéré via le flux
   « connexe »** comme promis (« on ne perd jamais une vraie offre ») ?
2. **Fiabilité du tri** : équilibre entre signaux structurés et heuristiques de texte — risque de **faux
   positifs** (bruit affiché) et **faux négatifs** (vraie offre mal classée). La règle « doute → connexe »
   est-elle réellement tenue ?
3. **Qualité de l'enrichissement** : les étiquettes déduites (logiciel/spécialité/niveau) — qui **font** le
   différenciateur — sont-elles fiables et non-filtrantes ?
4. **Dédoublonnage** : la signature studio+intitulé évite-t-elle les doublons **sans fusionner à tort** des
   offres distinctes ?
5. **Fraîcheur & péremption** : les offres mortes disparaissent-elles correctement ? La récurrence est-elle
   suffisante au regard de la promesse de fraîcheur ?
6. **Robustesse structurelle** : isolation des sources, résilience du scraping, tenue de charge, et réalité
   du principe « moteur générique / secteur = config ».
7. **Conformité** : respect effectif de la ligne rouge données personnelles, de l'attribution, et des refus
   explicites des sources.

---

*Ce brief décrit l'intention et l'architecture logique. L'auditeur pourra demander, en complément, l'accès
aux documents internes de décisions techniques et de R&D par source, ainsi qu'au produit en fonctionnement.*
