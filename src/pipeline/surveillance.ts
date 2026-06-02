/**
 * **Surveillance de santé des sources** — alerte quand une source casse.
 *
 * Deux pannes typiques (cf. les 17 connecteurs, dont des scrapings fragiles) :
 *  - **échec** : le connecteur a levé une erreur (réseau, 403, JSON invalide…) → `rapport.erreur`.
 *  - **vide suspect** : 0 offre récupérée alors que la source en avait **déjà en base** → casse
 *    **silencieuse** (ex. une structure HTML qui change → le parseur renvoie `[]` sans erreur).
 *    C'est le cas le plus dangereux car invisible sans surveillance.
 *
 * `analyserSante` est **pure** (testable) ; `envoyerAlertes` fait l'I/O (log + webhook optionnel).
 */
import type { CollectReport } from "./collect";

/** Seuil : une source ayant au moins ce nombre d'offres en base ne devrait jamais revenir à 0. */
const SEUIL_VIDE_SUSPECT = 3;

/**
 * Sources dont un « 0 récupérée » est **normal** (anti-bot qui passe par à-coups) → pas d'alerte
 * « vide suspect », sinon faux positif un run sur deux qui érode la confiance dans les alertes
 * (AUDIT §F). Un **échec** franc (erreur levée) reste signalé. Indeed est conservé mais bruyant.
 */
const SOURCES_VIDE_TOLERE: ReadonlySet<string> = new Set(["indeed"]);

export type NiveauAlerte = "echec" | "vide_suspect";

export interface Alerte {
  source: string;
  niveau: NiveauAlerte;
  message: string;
}

/**
 * Compare les rapports de collecte à l'état de la base (offres par source) pour repérer les pannes.
 * Pur et déterministe.
 * @param rapports rapports de la collecte qui vient de tourner
 * @param comptesParSource nombre d'offres **déjà en base** par source (avant/pendant ce run)
 */
export function analyserSante(
  rapports: CollectReport[],
  comptesParSource: Record<string, number>,
): Alerte[] {
  const alertes: Alerte[] = [];
  for (const r of rapports) {
    if (r.erreur) {
      alertes.push({ source: r.source, niveau: "echec", message: `échec de collecte : ${r.erreur}` });
      continue;
    }
    if (
      r.recuperees === 0 &&
      !SOURCES_VIDE_TOLERE.has(r.source) &&
      (comptesParSource[r.source] ?? 0) >= SEUIL_VIDE_SUSPECT
    ) {
      alertes.push({
        source: r.source,
        niveau: "vide_suspect",
        message: `0 offre récupérée alors que ${comptesParSource[r.source]} sont en base → connecteur probablement cassé`,
      });
    }
  }
  return alertes;
}

/** Met en forme un résumé lisible des alertes (pour log + webhook). */
export function formaterAlertes(alertes: Alerte[]): string {
  const lignes = alertes.map(
    (a) => `${a.niveau === "echec" ? "🔴" : "🟠"} [${a.source}] ${a.message}`,
  );
  return `⚠️ Hub Emploi 3D — ${alertes.length} source(s) en alerte :\n${lignes.join("\n")}`;
}

/**
 * Émet les alertes : **journalise** toujours (→ `collect.log`), et **pousse** vers un webhook
 * (Discord ou compatible `{content}`) si `ALERT_WEBHOOK_URL` est défini. Ne lève jamais (best-effort).
 */
export async function envoyerAlertes(alertes: Alerte[]): Promise<void> {
  if (alertes.length === 0) {
    console.log("✓ Santé sources : aucune alerte.");
    return;
  }
  const texte = formaterAlertes(alertes);
  console.warn(texte);

  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return; // pas de webhook configuré → log seul (suffisant pour le suivi)
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: texte.slice(0, 1900) }), // limite Discord ~2000
    });
  } catch (e) {
    console.error(`Webhook d'alerte injoignable : ${e instanceof Error ? e.message : String(e)}`);
  }
}
