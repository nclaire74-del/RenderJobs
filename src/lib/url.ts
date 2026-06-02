/**
 * Construction d'URL pour le dashboard : l'état des filtres vit dans la query
 * string (UC-2 — partageable, navigable, sans état serveur). Les composants
 * fabriquent leurs liens via ces helpers plutôt qu'à la main.
 */
import type { FiltreOffres } from "@/lib/offres-repo";

/** Valeurs des `searchParams` (Next 16 : objet simple, déjà résolu). */
export type ParamsBruts = Record<string, string | string[] | undefined>;

function premier(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : undefined;
}

/**
 * Construit une query string en partant des filtres courants et en appliquant
 * un patch. Une clé à `undefined` est retirée. `vue=coeur` et `page=1` sont
 * omis (valeurs par défaut → URL propre).
 */
export function construireHref(
  base: FiltreOffres,
  patch: Partial<FiltreOffres> = {},
): string {
  const f: FiltreOffres = { ...base, ...patch };
  const params = new URLSearchParams();

  if (f.vue && f.vue !== "coeur") params.set("vue", f.vue);
  if (f.pays) params.set("pays", f.pays);
  if (f.contrat) params.set("contrat", f.contrat);
  if (f.experience) params.set("experience", f.experience);
  if (f.q) params.set("q", f.q);
  if (f.page && f.page > 1) params.set("page", String(f.page));

  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export { premier };
