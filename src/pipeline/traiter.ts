/**
 * Transform **pur** appliqué à chaque offre après `normalize()`, commun à toutes les sources :
 * enrichissement (annote) → classification de pertinence (range). Aucune dépendance DB, donc
 * testable unitairement. Orchestré par `collect.ts`.
 */
import type { Offre, Pertinence } from "@/domain/offre";
import { enrichir } from "./enrichir";
import { classer } from "./classer";
import { signatureDedup } from "./dedup";
import { deduirePays } from "@/lib/pays";

/** Rang de pertinence (plus haut = plus pertinent), pour appliquer un plancher par source. */
const RANG: Record<Pertinence, number> = { hors_scope: 0, connexe: 1, coeur: 2 };

export interface TraiterOptions {
  /**
   * **Plancher de pertinence** : une source **curée** (board niche fiable, ex. AFJV) ne doit
   * jamais descendre sous ce niveau. Ex. `connexe` = jamais rejetée par le classifieur générique
   * (qui ne sait pas que la source est déjà 100 % dans le secteur). Cf. `PRODUIT.md` R-1.
   */
  plancher?: Pertinence;
}

/**
 * Enrichit puis classe une offre. Un `plancher` optionnel relève la pertinence des sources
 * de confiance (jamais en-dessous du plancher).
 */
export function traiter(offre: Offre, opts: TraiterOptions = {}): Offre {
  const enrichie = enrichir(offre);
  let pertinence = classer(enrichie);
  if (opts.plancher && RANG[pertinence] < RANG[opts.plancher]) {
    pertinence = opts.plancher;
  }
  const cleDedup = signatureDedup(enrichie.titre, enrichie.studio);
  // Pays **central** : normalise si fourni, sinon le déduit du lieu (ATS/boards mettent le pays dans
  // la ville) ou « À distance » si télétravail. Répare le filtre géo (AUDIT §C : 56 % NULL). Idempotent.
  const pays = deduirePays(enrichie.pays, enrichie.ville, enrichie.modeTravail);
  return { ...enrichie, pays, pertinence, cleDedup };
}
