/**
 * Script de collecte local : `npm run collect`.
 * Les variables d'environnement sont chargées via `--env-file=.env.local`
 * (cf. script npm), AVANT l'import du pipeline (les imports ES sont hissés).
 */
import { collecterEtPurger } from "@/pipeline/collect";

async function main() {
  const { rapports, purgees } = await collecterEtPurger();
  for (const r of rapports) {
    if (r.erreur) {
      console.error(`✗ ${r.source} : ${r.erreur}`);
    } else {
      console.log(
        `✓ ${r.source} : ${r.recuperees} récupérées, ${r.ecrites} écrites`,
      );
    }
  }
  if (purgees === null) {
    console.warn("⚠ Purge ignorée (aucune source n'a réussi).");
  } else {
    console.log(`🧹 Purge : ${purgees} offre(s) périmée(s) supprimée(s).`);
  }
  process.exit(rapports.some((r) => r.erreur) ? 1 : 0);
}

void main();
