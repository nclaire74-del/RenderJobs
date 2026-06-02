/**
 * **Déduplication inter-sources** (cf. ADR-0013, point ouvert). Une même offre peut être publiée sur
 * plusieurs sources (ex. un poste studio repris par Adzuna *et* France Travail *et* HelloWork). On veut
 * n'en **afficher qu'une** (la plus directe), sans rien supprimer en base.
 *
 * Mécanique : on calcule une **signature** stable et normalisée à partir du **studio + titre**. Deux
 * offres de même signature sont considérées **identiques**. La signature est stockée (`offres.cle_dedup`)
 * puis utilisée à la **lecture** (`offres-repo`) pour ne garder qu'un représentant par signature.
 *
 * Choix de prudence : **on ne déduplique QUE si le studio est connu** (sinon `null`). Sans studio, deux
 * « 3D Artist » d'entreprises différentes auraient la même signature → faux positif. Mieux vaut un
 * doublon résiduel qu'une offre **masquée à tort** (principe R-1 : ne jamais perdre une vraie offre).
 */

/** Tokens de **genre** (et variantes) à retirer : « h/f », « m/w/d », « nb »… → tokens isolés une fois la ponctuation neutralisée. */
const TOKENS_GENRE = new Set([
  "h", "f", "m", "w", "d", "nb", "hf", "fh", "mf", "fm", "mw", "wd", "mwd", "wmd", "hfd", "mfd",
]);

/** Normalise un fragment (titre/studio) : minuscules, sans accents, sans marqueurs de genre ni ponctuation. */
function normaliser(s: string): string {
  const base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // parenthèses (lieu, mention…)
    .replace(/[^a-z0-9]+/g, " "); // ponctuation → espace
  return base
    .split(/\s+/)
    .filter((t) => t && !TOKENS_GENRE.has(t)) // retire les tokens de genre isolés
    .join(" ")
    .trim();
}

/**
 * Signature de déduplication d'une offre. `null` (= jamais dédupliquée) si le **studio** manque
 * ou si la normalisation vide un champ. Sinon `"<studio normalisé>::<titre normalisé>"`.
 */
export function signatureDedup(
  titre: string,
  studio: string | null | undefined,
): string | null {
  if (!studio) return null;
  const t = normaliser(titre);
  const c = normaliser(studio);
  if (!t || !c) return null;
  return `${c}::${t}`;
}
