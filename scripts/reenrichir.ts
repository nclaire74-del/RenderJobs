/**
 * Ré-enrichissement des offres **déjà en base** : `npm run reenrichir [-- --apply]`.
 *
 * L'enrichissement (logiciels / spécialités) tourne à la collecte. Quand le **lexique**
 * évolue (`src/pipeline/enrichir.ts`), les offres déjà stockées gardent leurs anciennes
 * étiquettes jusqu'à un éventuel re-fetch. Ce script recalcule `logiciels` + `specialites`
 * pour **toutes** les offres à partir de leur `titre` + `description`, et met à jour celles
 * qui changent. Idempotent.
 *
 * ⚠️ Ne touche **pas** à la pertinence (le classifieur n'utilise pas `specialites` ; le lexique
 * `logiciels`, lui, est recalculé à l'identique tant qu'on ne le modifie pas).
 *
 * **Dry-run par défaut** : affiche l'impact sans écrire. `-- --apply` pour appliquer.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { offres, type OffreRow } from "@/db/schema";
import { enrichir } from "@/pipeline/enrichir";
import type { Offre } from "@/domain/offre";

/** Construit l'Offre minimale dont `enrichir` a besoin (il ne lit que titre + description). */
function versOffre(row: OffreRow): Offre {
  return {
    id: `${row.source}:${row.sourceId}`,
    source: row.source,
    sourceId: row.sourceId,
    url: row.url,
    titre: row.titre,
    studio: row.studio,
    pays: row.pays,
    ville: row.ville,
    latitude: row.latitude,
    longitude: row.longitude,
    modeTravail: row.modeTravail as Offre["modeTravail"],
    contrat: row.contrat as Offre["contrat"],
    experience: row.experience as Offre["experience"],
    logiciels: row.logiciels,
    specialites: row.specialites,
    pertinence: row.pertinence as Offre["pertinence"],
    langue: row.langue,
    salaire: row.salaire,
    publieLe: row.publieLe,
    recupereLe: row.recupereLe,
    description: row.description,
  };
}

const memeListe = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

async function main() {
  const apply = process.argv.slice(2).includes("--apply");
  const rows = await db.select().from(offres);

  let changees = 0;
  let gagnantesSpe = 0; // offres qui passent de « 0 spécialité » à « ≥1 »
  for (const row of rows) {
    const e = enrichir(versOffre(row));
    const changeLogi = !memeListe(e.logiciels, row.logiciels);
    const changeSpe = !memeListe(e.specialites, row.specialites);
    if (!changeLogi && !changeSpe) continue;

    changees++;
    if (row.specialites.length === 0 && e.specialites.length > 0) gagnantesSpe++;

    if (apply) {
      await db
        .update(offres)
        .set({ logiciels: e.logiciels, specialites: e.specialites })
        .where(eq(offres.id, row.id));
    }
  }

  const mode = apply ? "APPLIQUÉ" : "DRY-RUN (rien écrit)";
  console.log(
    `[reenrichir] ${mode} — ${rows.length} offres examinées, ${changees} modifiées, ` +
      `dont ${gagnantesSpe} qui gagnent une 1ʳᵉ spécialité.`,
  );
  if (!apply) console.log("→ relancer avec « -- --apply » pour écrire.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
