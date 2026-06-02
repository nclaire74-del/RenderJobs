/**
 * Upsert d'offres normalisées en base, avec déduplication.
 *
 * Clé de conflit : (`source`, `source_id`). Une offre déjà connue est mise à jour
 * (titre, salaire, description… peuvent évoluer) sans dupliquer la ligne.
 * `recupere_le` est rafraîchi à chaque passage.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { offres, type NouvelleOffreRow } from "@/db/schema";
import type { Offre } from "@/domain/offre";

function toRow(o: Offre): NouvelleOffreRow {
  return {
    source: o.source,
    sourceId: o.sourceId,
    url: o.url,
    titre: o.titre,
    studio: o.studio,
    pays: o.pays,
    ville: o.ville,
    latitude: o.latitude,
    longitude: o.longitude,
    modeTravail: o.modeTravail,
    contrat: o.contrat,
    experience: o.experience,
    logiciels: o.logiciels,
    specialites: o.specialites,
    pertinence: o.pertinence,
    langue: o.langue,
    salaire: o.salaire,
    cleDedup: o.cleDedup ?? null,
    publieLe: o.publieLe,
    recupereLe: o.recupereLe,
    description: o.description,
  };
}

export interface UpsertResult {
  recus: number;
  ecrits: number;
}

/**
 * Insère/met à jour un lot d'offres. Retourne le nombre **reçu** (avant filtre) et **écrit**.
 *
 * **Politique** : on ne **persiste pas** les offres `hors_scope` — elles ne sont **jamais affichées**
 * (cf. `offres-repo`), donc les stocker ne ferait qu'alimenter du bruit en base. Le classifieur les
 * a déjà écartées ; on garde `recus` = ce que la source a ramené (pour la surveillance « vide suspect »)
 * et `ecrits` = ce qui entre réellement en base.
 */
export async function upsertOffres(liste: Offre[]): Promise<UpsertResult> {
  if (liste.length === 0) return { recus: 0, ecrits: 0 };

  const aEcrire = liste.filter((o) => o.pertinence !== "hors_scope");
  if (aEcrire.length === 0) return { recus: liste.length, ecrits: 0 };

  const rows = aEcrire.map(toRow);
  const ecrits = await db
    .insert(offres)
    .values(rows)
    .onConflictDoUpdate({
      target: [offres.source, offres.sourceId],
      set: {
        url: sql`excluded.url`,
        titre: sql`excluded.titre`,
        studio: sql`excluded.studio`,
        pays: sql`excluded.pays`,
        ville: sql`excluded.ville`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
        modeTravail: sql`excluded.mode_travail`,
        contrat: sql`excluded.contrat`,
        // Champs déduits : déterministes → on les rafraîchit à chaque collecte
        // (recalculés depuis la description, qui peut elle-même évoluer).
        experience: sql`excluded.experience`,
        logiciels: sql`excluded.logiciels`,
        specialites: sql`excluded.specialites`,
        pertinence: sql`excluded.pertinence`,
        langue: sql`excluded.langue`,
        salaire: sql`excluded.salaire`,
        cleDedup: sql`excluded.cle_dedup`,
        publieLe: sql`excluded.publie_le`,
        recupereLe: sql`excluded.recupere_le`,
        description: sql`excluded.description`,
      },
    })
    .returning({ id: offres.id });

  return { recus: liste.length, ecrits: ecrits.length };
}
