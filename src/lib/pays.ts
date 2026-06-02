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
/** Valeur de pays pour les offres **télétravail** sans lieu géographique précis (filtre « Lieu »). */
export const PAYS_DISTANCE = "À distance";

const NOM_PAYS: Record<string, string> = {
  // Mentions « télétravail/monde » fournies comme pays → fusionnées dans une valeur unique.
  remote: PAYS_DISTANCE, worldwide: PAYS_DISTANCE, global: PAYS_DISTANCE,
  anywhere: PAYS_DISTANCE, "remote - global": PAYS_DISTANCE,
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
  no: "Norvège", norway: "Norvège", dk: "Danemark", denmark: "Danemark",
  nz: "Nouvelle-Zélande", "new zealand": "Nouvelle-Zélande",
  cz: "Tchéquie", czechia: "Tchéquie", "czech republic": "Tchéquie",
  at: "Autriche", austria: "Autriche", ro: "Roumanie", romania: "Roumanie",
  bg: "Bulgarie", bulgaria: "Bulgarie", ua: "Ukraine", ukraine: "Ukraine",
  tr: "Turquie", turkey: "Turquie", gr: "Grèce", greece: "Grèce",
  hu: "Hongrie", hungary: "Hongrie", lt: "Lituanie", lithuania: "Lituanie",
  ar: "Argentine", argentina: "Argentine", uy: "Uruguay", uruguay: "Uruguay",
  br: "Brésil", brazil: "Brésil", mx: "Mexique", mexico: "Mexique",
  kr: "Corée du Sud", "south korea": "Corée du Sud", korea: "Corée du Sud",
  id: "Indonésie", indonesia: "Indonésie", my: "Malaisie", malaysia: "Malaisie",
};

/** Code pays ISO-2 ou libellé → nom lisible (FR). Best-effort, sinon renvoie l'entrée trimée. */
export function nomPays(brut: string | null | undefined): string | null {
  if (!brut) return null;
  const t = brut.trim();
  if (!t) return null;
  return NOM_PAYS[t.toLowerCase()] ?? t;
}

/** Un segment de lieu est-il un pays **reconnu** ? (≠ `nomPays`, qui laisse passer l'inconnu.) */
function paysSiConnu(segment: string): string | null {
  // Retire un éventuel préfixe code ISO « ES - », « US - » devant le nom.
  const net = segment.replace(/^[A-Za-z]{2}\s*-\s*/, "").trim();
  return NOM_PAYS[net.toLowerCase()] ?? null;
}

/**
 * Extrait un **pays reconnu** d'une chaîne de lieu libre, telle que fournie par les ATS/boards :
 * « San Mateo, CA, United States », « ES - Barcelona, Spain », « Singapore », « Montreal,Quebec,Canada ».
 * Multi-lieux (« A; B; C ») → on prend le **premier**. On teste les segments du dernier au premier
 * et on renvoie le **premier reconnu** comme pays (le pays est presque toujours en fin de chaîne).
 * Renvoie `null` si aucun segment n'est un pays connu (ex. ville seule « Brighton »).
 */
export function paysDepuisLieu(lieu: string | null | undefined): string | null {
  if (!lieu) return null;
  const premierLieu = lieu.split(";")[0] ?? "";
  const segments = premierLieu.split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const connu = paysSiConnu(segments[i]);
    if (connu) return connu;
  }
  return null;
}

/**
 * **Pays effectif** d'une offre, par ordre de fiabilité : (1) le `pays` déjà posé par la source
 * (normalisé) ; (2) déduit de la chaîne `ville`/lieu ; (3) « À distance » si l'offre est en
 * télétravail ; sinon `null` (lieu réellement inconnu). Centralise la réparation du filtre géo
 * (cf. AUDIT §C : pays NULL sur 56 % du catalogue). Pur, testable.
 */
export function deduirePays(
  paysBrut: string | null | undefined,
  ville: string | null | undefined,
  modeTravail: string | null | undefined,
): string | null {
  const direct = nomPays(paysBrut);
  if (direct) return direct;
  const duLieu = paysDepuisLieu(ville);
  if (duLieu) return duLieu;
  if (modeTravail === "remote") return PAYS_DISTANCE;
  return null;
}
