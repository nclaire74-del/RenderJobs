/**
 * Normalisation des **pays** vers un libellé lisible **français**.
 *
 * Les sources fournissent le pays de façons hétérogènes : code ISO-2 (`FR`, `GB`), nom anglais
 * (`United States`), nom français… Si on ne normalise pas, le **filtre pays** du dashboard se
 * retrouve avec des doublons (`FR` *et* `France`) et rate des offres. Toute source qui pose un
 * pays doit passer par `nomPays()` pour garantir un libellé unique côté facette/filtre.
 *
 * Best-effort : une entrée inconnue est renvoyée telle quelle (trimée), jamais perdue.
 */
const NOM_PAYS: Record<string, string> = {
  fr: "France", france: "France",
  gb: "Royaume-Uni", uk: "Royaume-Uni", "united kingdom": "Royaume-Uni",
  us: "États-Unis", usa: "États-Unis", "united states": "États-Unis",
  ca: "Canada", canada: "Canada", de: "Allemagne", germany: "Allemagne",
  fi: "Finlande", finland: "Finlande", se: "Suède", sweden: "Suède",
  nl: "Pays-Bas", netherlands: "Pays-Bas", es: "Espagne", spain: "Espagne",
  sg: "Singapour", singapore: "Singapour", ie: "Irlande", ireland: "Irlande",
  be: "Belgique", belgium: "Belgique", ch: "Suisse", switzerland: "Suisse",
  it: "Italie", italy: "Italie", pt: "Portugal", portugal: "Portugal",
  pl: "Pologne", poland: "Pologne", jp: "Japon", japan: "Japon",
  cn: "Chine", china: "Chine", au: "Australie", australia: "Australie",
  in: "Inde", india: "Inde",
};

/** Code pays ISO-2 ou libellé → nom lisible (FR). Best-effort, sinon renvoie l'entrée trimée. */
export function nomPays(brut: string | null | undefined): string | null {
  if (!brut) return null;
  const t = brut.trim();
  if (!t) return null;
  return NOM_PAYS[t.toLowerCase()] ?? t;
}
