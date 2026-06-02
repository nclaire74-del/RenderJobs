/**
 * Script de collecte local : `npm run collect`.
 * Les variables d'environnement sont chargées via `--env-file=.env.local`
 * (cf. script npm), AVANT l'import du pipeline (les imports ES sont hissés).
 */
import {
  collecterEtPurger,
  collecterLegerEtPurger,
  collecterExpress,
} from "@/pipeline/collect";

async function main() {
  // Mode de collecte : `express` (flux curés, cron ~5 min) | `leger` (sources rapides, ~20 min)
  // | défaut `complet` (toutes les sources + purge, ~2 h).
  const args = process.argv.slice(2);
  const mode = args.includes("express")
    ? "express"
    : args.includes("leger")
      ? "leger"
      : "complet";
  const horodatage = new Date().toISOString();
  console.log(`[${horodatage}] collecte ${mode.toUpperCase()} —`);
  const { rapports, purgees, alertes } =
    mode === "express"
      ? await collecterExpress()
      : mode === "leger"
        ? await collecterLegerEtPurger()
        : await collecterEtPurger();
  for (const r of rapports) {
    if (r.erreur) {
      console.error(`✗ ${r.source} : ${r.erreur}`);
    } else {
      console.log(
        `✓ ${r.source} : ${r.recuperees} récupérées, ${r.ecrites} écrites`,
      );
    }
  }
  if (mode === "express") {
    // L'express n'a pas de purge (volontaire) — pas de message trompeur.
  } else if (purgees === null) {
    console.warn("⚠ Purge ignorée (aucune source n'a réussi).");
  } else {
    console.log(`🧹 Purge : ${purgees} offre(s) périmée(s) supprimée(s).`);
  }
  // Les alertes sont déjà journalisées par envoyerAlertes ; on sort en erreur si une source casse.
  const probleme = rapports.some((r) => r.erreur) || alertes.length > 0;
  process.exit(probleme ? 1 : 0);
}

void main();
