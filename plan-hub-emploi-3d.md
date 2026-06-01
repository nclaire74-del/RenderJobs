# 🎯 Hub d'Emploi 3D & Jeu Vidéo — Plan de Projet

*Document de référence — version 1. À faire évoluer au fil du projet.*

---

## 1. Vision & Objectif (le "Goal")

**Centraliser, en un seul endroit, toutes les offres d'emploi du monde de la 3D, du jeu vidéo, de l'animation et de la cinématique** — pour ne plus avoir à visiter 10 sites différents.

> L'utilisateur arrive, voit *toutes* les annonces d'un coup, les filtre selon ses critères de métier, et clique pour postuler directement sur la source officielle. Sans inscription, sans friction.

**Promesse de valeur :** plus rapide, plus pertinent et plus simple que de chercher soi-même sur chaque plateforme.

---

## 2. Principes de conception (non négociables)

- **Sans compte** : on voit tout immédiatement, pas de login.
- **Redirection directe** : un clic = la page officielle de l'offre.
- **Niche assumée** : uniquement 3D / jeu / animation / VFX / cinématique.
- **Fraîcheur** : être prévenu le premier quand une offre tombe.
- **Légal & propre** : sources officielles d'abord, pas de scraping de données personnelles.

---

## 3. Fonctionnalités

### 3.1 — Le flux centralisé (cœur du produit)
Toutes les offres agrégées en un seul flux, design "dashboard" sombre et épuré, adapté aux artistes.

### 3.2 — Les filtres
**Filtres classiques (le minimum) :**
- Mode de travail : Remote / Hybride / Sur site
- Type de contrat : CDI / CDD / Stage / Freelance / Alternance
- Géographie : pays, ville, **rayon de distance** (ex. < 20 km de Lyon)

**Filtres différenciants (la vraie valeur — personne d'autre ne les a) :**
- 🛠️ **Par logiciel** : Blender, Maya, ZBrush, Houdini, Substance, Unreal, Unity, Nuke…
- 📈 **Par niveau d'expérience** : Junior / Confirmé / Senior / Lead
- 🎨 **Par spécialité** : Character, Environment, Rigging, Animation, VFX, Lighting, Technical Artist, Cinématique…

> ⚙️ Note technique : ces 3 filtres ne sont pas fournis par les API. On les **déduit** en analysant le texte de l'annonce (recherche de mots-clés connus). C'est une étape d'« enrichissement » du pipeline — c'est ce qui rend le site malin.

### 3.3 — La vitesse (être le premier)
- **Polling régulier** des sources (toutes les 5–15 min) — possible *uniquement* grâce aux sources légales.
- **Détection du neuf** : on mémorise les offres déjà vues (par identifiant) → on n'alerte que sur du vraiment nouveau.
- **Alertes filtrées** : « préviens-moi seulement pour : remote + Character Artist + Blender ».

### 3.4 — Les canaux de notification
- 🔔 **Discord** (prioritaire) : un bot poste chaque nouvelle offre via webhook, dans des salons thématiques (#remote, #junior, #unreal…). Double rôle : notification **+ moteur de croissance communautaire**.
- 📧 **Email** : juste une adresse + des critères (mode instantané ou résumé quotidien). Reste cohérent avec le « sans compte ».
- *(Plus tard : push navigateur, Telegram, flux RSS du site.)*

### 3.5 — Soumission communautaire
Formulaire / commande Discord pour qu'un utilisateur **colle le lien** d'une offre (ex. un post LinkedIn « on recrute »). Après validation, elle entre dans le flux.
→ Capture les annonces informelles **sans scraping de données personnelles**, et fait vivre la communauté.

---

## 4. Sources de données (par niveau de risque)

| Source | Type d'accès | Statut |
|---|---|---|
| **France Travail** | API officielle gratuite (`motsCles`, `commune`, `rayon`) | 🟢 Fondation — à faire en premier |
| **EURES** (emploi UE) | API officielle | 🟢 À évaluer |
| Boards spé (AFJV, 80 Level, GameJobs.co, ArtStation, SNJV) | Flux RSS / API à vérifier au cas par cas | 🟢 / 🟠 selon dispo |
| **Soumission communautaire** (dont posts LinkedIn) | Humain dans la boucle | 🟢 Propre |
| LinkedIn / Indeed — **offres formelles** | API tierce payante (zone grise ToS) | 🟠 Phase avancée, si compromis acceptés |
| LinkedIn — **posts perso de recruteurs** (scraping auto) | — | 🔴 Écarté (RGPD + ToS). Passe par la soumission communautaire. |

---

## 5. Stack technique recommandée

- **Frontend** : Next.js (React) + TailwindCSS — dashboard sombre, rapide, moderne.
- **Backend** : routes API Next.js (suffisant pour la V1) ou petit service Node/Express ensuite.
- **Base de données** : PostgreSQL (recherche plein-texte + géo natives). SQLite possible pour prototyper.
- **Planification (cron)** : Vercel Cron ou worker Node (`node-cron`).
- **Notifications** : webhook Discord (gratuit, trivial) + service email (Resend / SendGrid).
- **Hébergement** : Vercel (front + cron) + Postgres managé (Neon ou Supabase).

---

## 6. Architecture (vue d'ensemble)

```
┌─────────────┐   poll 5-15min   ┌──────────────────┐
│   SOURCES   │ ───────────────▶ │  COLLECTEUR (cron)│
│ FT API, RSS │                  │  + dédup + enrichi.│
└─────────────┘                  └────────┬─────────┘
                                          │ écrit
                                          ▼
┌─────────────┐                  ┌──────────────────┐
│ NOTIFICATION│ ◀─── nouveau ─── │   BASE (Postgres) │
│ Discord/Mail│                  │  offres normalisées│
└─────────────┘                  └────────┬─────────┘
                                          │ lit
                                          ▼
                                 ┌──────────────────┐
                                 │ FRONTEND (Next.js)│
                                 │  flux + filtres    │
                                 └──────────────────┘
```

---

## 7. Modèle de données (l'offre normalisée)

Chaque source a un format différent → on les ramène toutes à **un seul format commun** :

```
Offre {
  id            // source + identifiant source (clé d'unicité)
  source        // "france-travail", "rss-afjv", "communaute"...
  url           // lien direct pour postuler
  titre
  studio        // entreprise
  pays, ville, latitude, longitude
  modeTravail   // remote | hybride | onsite
  contrat       // CDI | CDD | stage | freelance | alternance
  experience    // junior | confirme | senior | lead   (déduit)
  logiciels     // [Blender, Unreal, ...]               (déduit)
  specialites   // [character, vfx, ...]                 (déduit)
  salaire       // si disponible
  publieLe
  recupereLe
  description   // texte brut
}
```

---

## 8. Feuille de route par phases

### Phase 0 — Fondations
Repo + Next.js + Tailwind. Schéma de base. Connexion à l'API France Travail. Affichage d'un flux brut.

### Phase 1 — MVP utilisable
Filtres géo / contrat / mode de travail. Enrichissement (logiciel / expérience / spécialité). Ajout de 2-3 flux RSS spécialisés. Cron de polling + détection du neuf. Design dashboard soigné.

### Phase 2 — Vitesse & communauté
Webhook Discord. Alertes email filtrées. Formulaire de soumission communautaire (capture les posts LinkedIn proprement).

### Phase 3 — Sources avancées & passage à l'échelle
Offres formelles LinkedIn / Indeed via API tierce (si compromis acceptés). Plus de boards. Cache & perf. Statistiques.

---

## 9. Conformité (à garder en tête)

- **RGPD** : pas de collecte automatique de données personnelles (posts de recruteurs). Mentions légales + politique de confidentialité dès qu'on collecte des emails pour les alertes.
- **ToS** : respecter les conditions de chaque source. Privilégier API et RSS.
- **Attribution** : afficher la source de chaque offre et renvoyer vers l'originale.

---

## 10. Décisions à prendre

1. Stockage des emails d'alerte = on accepte une mini-base d'emails (pas un "compte", mais une donnée à protéger). OK ?
2. Discord : serveur public communautaire dès la V1, ou juste webhook privé d'abord ?
3. Quelles 2-3 sources RSS spécialisées prioriser après France Travail ?
