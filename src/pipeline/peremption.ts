/**
 * Logique **pure** de péremption des offres (sans DB → testable unitairement).
 * Consommée par `purge.ts` (qui, lui, exécute la suppression en base).
 *
 * `joursMax` par défaut = 30 (cohérent avec les fenêtres de collecte : FT `publieeDepuis=31j`,
 * Adzuna `max_days_old=31`). Une offre dont le `recupere_le` n'a pas bougé depuis plus de `joursMax`
 * n'est plus listée par aucune source → considérée **morte**.
 */
export const JOURS_MAX_DEFAUT = 30;
const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/** Calcule le seuil de péremption : toute offre `recupere_le < seuil` est morte. */
export function seuilPurge(maintenant: Date, joursMax: number = JOURS_MAX_DEFAUT): Date {
  return new Date(maintenant.getTime() - joursMax * MS_PAR_JOUR);
}
