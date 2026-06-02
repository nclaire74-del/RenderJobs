# R&D — LinkedIn (et Indeed) : faisabilité & verdict de risque

> Cible citée par la proprio. Document de **recherche**, read-only, sondé le 2026-06-02. **Conclusion en
> tête : techniquement atteignable, mais explicitement INTERDIT (robots.txt + ToS) → NON recommandé en
> collecte automatique.** Voies légitimes : API officielle (gated) ou **soumission communautaire**.
> À lire avec ADR-0007 (posture scraping « zone grise ») **et** sa ligne rouge ; ici on n'est PAS en zone
> grise mais face à une **interdiction explicite** — c'est une décision de **risque** qui revient à la proprio.

---

## 1. Ce qui est techniquement atteignable (constat factuel)

- **Endpoint « guest »** : `GET https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=…&location=…&start=N`
  → **200**, **HTML** (~25 cartes d'offres/page, pagination par `start`). Champs visibles : **titre**, **société**,
  **lieu**, **lien** `…/jobs/view/{id}`. Ce sont des **offres formelles d'entreprises** (pas des posts perso de
  recruteurs → pas la ligne rouge RGPD du projet). Servi derrière **Cloudflare**.
- Page `/jobs/search` (déconnecté) : rendu limité / pousse au login (authwall) pour le détail.

## 2. Pourquoi c'est NON (les bloqueurs, factuels)

- 🚫 **`robots.txt` interdit explicitement** : `Disallow: /jobs-guest/` — **l'endpoint qui marche est nommément
  interdit**. Ce n'est donc **pas** une « zone grise » au sens d'ADR-0007 (sites sans position claire) ; c'est un
  refus écrit. Le respecter est la position par défaut du projet (attribution, légitimité).
- 🚫 **ToS LinkedIn** : interdisent explicitement l'accès automatisé/scraping (compte requis, anti-bot).
- ⚠️ **Anti-bot agressif** : Cloudflare + détection comportementale + **bannissement d'IP rapide** ; collecte en
  cron = IP grillée vite (→ proxies résidentiels = coût + escalade dans l'illégitimité).
- ⚖️ **Historique juridique** : le scraping LinkedIn est un terrain contentieux (hiQ v. LinkedIn ; durcissements
  successifs). Risque réputationnel/juridique disproportionné pour un petit produit.

## 3. La voie « officielle » n'est pas ouverte

- **Pas d'API publique de lecture des offres**. Les **LinkedIn Talent Solutions / Jobs API** sont **gated
  partenaires** (contrat, validation, volumétrie payante) — hors de portée d'un projet indé non partenaire.
- L'API « Job Posting » existante sert à **publier** des offres (côté employeur), **pas à les lire/agréger**.

## 4. Indeed (source sœur, même Tier 4) — verdict identique

- **API publique supprimée** (Indeed Publisher API fermée) ; pages protégées Cloudflare + anti-bot ; ToS anti-scraping.
- Même conclusion : pas de voie automatique légitime ; le volume Indeed est de toute façon largement **redondant**
  avec ce qu'on agrège déjà (ATS, Adzuna, boards) → faible valeur marginale, fort risque.

## 5. Recommandation (décision de risque = proprio)

**Ne pas brancher LinkedIn/Indeed en collecte automatique.** Raison : interdiction explicite (robots+ToS) +
risque juridique/IP disproportionné, alors que la **valeur marginale est faible** (les offres « cœur » sont
mieux captées, en clair et légalement, via **ATS studios + ArtStation + boards niche + Adzuna/FT**).

Voies **légitimes** si LinkedIn reste souhaité :
1. **Soumission communautaire** (déjà dans le modèle produit) : un humain colle le lien d'une offre LinkedIn →
   on stocke **lien + métadonnées minimales** (attribution), pas de scraping de masse. Conforme, zéro risque.
2. **API officielle** seulement si le projet devient **partenaire LinkedIn** (peu réaliste à ce stade).
3. **Sinon : passer.** Concentrer l'effort sur les sources ouvertes à fort rendement (ArtStation, SmartRecruiters,
   The Rookies…), bien plus rentables et sans risque.

## 6. Verdict

LinkedIn (et Indeed) sont **techniquement scrapables mais explicitement interdits** (robots.txt `Disallow:
/jobs-guest/` + ToS) et **juridiquement risqués**, pour une **valeur marginale faible** vu nos sources ouvertes
déjà riches. **Reco : NON en automatique ; LinkedIn = soumission communautaire uniquement.** C'est un arbitrage
de **risque stratégique** → à trancher par la proprio, pas un défaut technique.
