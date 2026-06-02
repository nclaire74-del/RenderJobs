/**
 * **Purge des offres périmées** — fraîcheur de la base (cf. `PRODUIT.md`, principe « fraîcheur »).
 *
 * Problème : une offre disparaît de sa source quand elle est pourvue/expirée, mais elle reste en
 * base (l'upsert ne supprime jamais). Sans purge, les offres mortes s'accumulent.
 *
 * Stratégie **universelle et sûre** (source-agnostique) : à chaque collecte, `recupere_le` de toute
 * offre **encore présente** chez sa source est rafraîchi (cf. `upsert.ts`). Donc une offre dont le
 * `recupere_le` **n'a plus bougé depuis N jours** n'est plus proposée par aucune source → **morte**.
 * On la supprime. Robuste pour toutes les sources (pas besoin de connaître leur pagination), tant
 * que la collecte tourne régulièrement (cron quotidien).
 *
 * ⚠️ **Garde-fou** (appliqué par l'orchestrateur, cf. `collect.ts`) : ne purger que si **au moins une
 * source a réussi** ; sinon une panne réseau globale (toutes les sources en échec → aucun
 * `recupere_le` rafraîchi) finirait par **vider la base**.
 *
 * `joursMax` par défaut = 30 (cohérent avec les fenêtres de collecte : FT `publieeDepuis=31j`,
 * Adzuna `max_days_old=31`). Plus court = base plus fraîche mais risque de purger une offre qu'une
 * source lente n'a pas re-listée ; 30 j laisse une marge confortable.
 */
import { lt } from "drizzle-orm";
import { db } from "@/db/client";
import { offres } from "@/db/schema";
import { seuilPurge } from "./peremption";

export interface PurgeOptions {
  /** Âge maximal (en jours) sans avoir été revue par une collecte. Au-delà → supprimée. */
  joursMax?: number;
  /** Instant de référence (injectable pour les tests). Défaut : maintenant. */
  maintenant?: Date;
}

/**
 * Supprime les offres dont `recupere_le` est antérieur à `maintenant - joursMax`.
 * Retourne le nombre de lignes supprimées.
 */
export async function purgeOffresPerimees(opts: PurgeOptions = {}): Promise<number> {
  const maintenant = opts.maintenant ?? new Date();
  const seuil = seuilPurge(maintenant, opts.joursMax);

  const supprimees = await db
    .delete(offres)
    .where(lt(offres.recupereLe, seuil))
    .returning({ id: offres.id });

  return supprimees.length;
}
