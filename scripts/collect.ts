/**
 * Script de collecte local : `npm run collect`.
 * Les variables d'environnement sont chargées via `--env-file=.env.local`
 * (cf. script npm), AVANT l'import du pipeline (les imports ES sont hissés).
 */
import { collectToutes } from "@/pipeline/collect";

async function main() {
  const rapports = await collectToutes();
  for (const r of rapports) {
    if (r.erreur) {
      console.error(`✗ ${r.source} : ${r.erreur}`);
    } else {
      console.log(
        `✓ ${r.source} : ${r.recuperees} récupérées, ${r.ecrites} écrites`,
      );
    }
  }
  process.exit(rapports.some((r) => r.erreur) ? 1 : 0);
}

void main();
