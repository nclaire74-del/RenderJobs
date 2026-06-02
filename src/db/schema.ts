/**
 * Schéma Drizzle — table `offres`.
 *
 * Reflète le type métier `Offre` (cf. `src/domain/offre.ts`).
 * Clé d'unicité métier : (`source`, `source_id`) → permet l'upsert/déduplication.
 */
import {
  doublePrecision,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const offres = pgTable(
  "offres",
  {
    id: serial("id").primaryKey(),

    source: text("source").notNull(),
    sourceId: text("source_id").notNull(),
    url: text("url").notNull(),

    titre: text("titre").notNull(),
    studio: text("studio"),

    pays: text("pays"),
    ville: text("ville"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    modeTravail: text("mode_travail"),
    contrat: text("contrat"),
    experience: text("experience"),

    /** Listes déduites stockées en text[] natif Postgres. */
    logiciels: text("logiciels").array().notNull().default([]),
    specialites: text("specialites").array().notNull().default([]),

    /** Classe de pertinence déduite (coeur|connexe|hors_scope). Défaut conservateur : connexe. */
    pertinence: text("pertinence").notNull().default("connexe"),
    /** Langue détectée de l'annonce (ISO 639-1). */
    langue: text("langue"),

    salaire: text("salaire"),

    /**
     * **Signature de déduplication inter-sources** (studio+titre normalisés, cf. `pipeline/dedup.ts`).
     * `null` = jamais dédupliquée (studio inconnu). Utilisée à la lecture pour n'afficher qu'un
     * représentant par signature (la source la plus directe).
     */
    cleDedup: text("cle_dedup"),

    publieLe: timestamp("publie_le", { withTimezone: true }),
    recupereLe: timestamp("recupere_le", { withTimezone: true })
      .notNull()
      .defaultNow(),

    description: text("description"),
  },
  (t) => [
    // Déduplication : une offre est identifiée de façon unique par sa source + son id source.
    unique("offres_source_source_id_unique").on(t.source, t.sourceId),
    // Tri par fraîcheur (cas d'usage principal du dashboard).
    index("offres_publie_le_idx").on(t.publieLe),
    // Flux principal = filtrer par pertinence puis trier par fraîcheur.
    index("offres_pertinence_publie_le_idx").on(t.pertinence, t.publieLe),
    // Déduplication inter-sources à la lecture (regroupement par signature).
    index("offres_cle_dedup_idx").on(t.cleDedup),
    // Filtres/facettes différenciants sur tableaux : containment `@>` + `unnest` → index GIN
    // (sinon scan séquentiel, dégrade à fort volume — AUDIT §C/§H).
    index("offres_logiciels_gin").using("gin", t.logiciels),
    index("offres_specialites_gin").using("gin", t.specialites),
  ],
);

export type OffreRow = typeof offres.$inferSelect;
export type NouvelleOffreRow = typeof offres.$inferInsert;
