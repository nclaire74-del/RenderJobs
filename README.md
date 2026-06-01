# Hub d'Emploi 3D & Jeu Vidéo

Agrégateur d'offres d'emploi de la **3D, du jeu vidéo, de l'animation, du VFX et de la cinématique**.
Toutes les annonces en un seul flux, filtrables par métier / logiciel / niveau, avec redirection directe
vers la source officielle. **Sans compte, sans friction.**

- 📋 **Vision & périmètre** : [`plan-hub-emploi-3d.md`](./plan-hub-emploi-3d.md)
- 🧠 **Mémoire & conventions du projet** : [`CLAUDE.md`](./CLAUDE.md)
- 🗂️ **Journal de décisions techniques (ADR)** : [`DECISIONS.md`](./DECISIONS.md)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL + Drizzle ORM (Neon) ·
Zod · Vitest. Déploiement Vercel.

## Démarrage

```bash
npm install
npm run dev      # http://localhost:3000
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run test` | Tests Vitest *(à venir)* |

## Conformité

Sources officielles (API/RSS) + soumission communautaire. **Aucun scraping de données personnelles.**
Chaque offre affiche sa source et renvoie vers l'annonce originale.
