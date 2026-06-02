/**
 * Couche d'accès en lecture aux offres (dashboard).
 *
 * Le dashboard est un Server Component : il interroge directement Postgres via
 * Drizzle (cf. ADR-0003, et docs Next 16 « fetching data with an ORM »).
 *
 * Règles produit appliquées ici (cf. `PRODUIT.md`) :
 * - `hors_scope` n'est **jamais** affiché ;
 * - vue par défaut = `coeur` (flux principal), 2ᵉ onglet = `connexe` ;
 * - tri par fraîcheur : `publie_le` desc en priorité, repli sur `recupere_le`
 *   (UC-1 : le scan rapide trié par fraîcheur) ;
 * - filtres combinables, état porté par l'URL (UC-2 : partageable).
 */
import {
  and,
  arrayContains,
  asc,
  desc,
  eq,
  ilike,
  or,
  sql,
  count,
  getTableColumns,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { offres, type OffreRow } from "@/db/schema";
import type {
  Contrat,
  Experience,
  ModeTravail,
  Pertinence,
} from "@/domain/offre";

/**
 * **Clé de regroupement pour la déduplication** : la signature `cle_dedup` si présente, sinon
 * l'`id` (offre sans studio → jamais fusionnée). Cf. `pipeline/dedup.ts` et ADR-0024.
 */
const CLE_GROUPE = sql`coalesce(${offres.cleDedup}, ${offres.id}::text)`;

/**
 * **Priorité de source** pour choisir le représentant d'un doublon (plus petit = préféré) : la source
 * la plus **directe** d'abord (ATS studio → officiel FR → boards niche → agrégateurs qui relaient).
 */
const PRIORITE_SOURCE = sql`case ${offres.source}
  when 'ats' then 1
  when 'france-travail' then 2
  when 'afjv' then 3
  when 'hellowork' then 4
  when 'adzuna' then 8
  when 'remoteok' then 8
  else 5 end`;

/** Onglets visibles du dashboard (jamais `hors_scope`). */
export type Vue = Extract<Pertinence, "coeur" | "connexe">;

export const VUES: readonly Vue[] = ["coeur", "connexe"] as const;

/** Nombre d'offres par page (flux infini paginé par lien). */
export const TAILLE_PAGE = 60;

/** Critères de filtrage issus des `searchParams` de l'URL. */
export interface FiltreOffres {
  vue: Vue;
  pays?: string;
  contrat?: Contrat;
  experience?: Experience;
  /** Filtre différenciant : un logiciel déduit (label canon, ex. "Blender"). */
  logiciel?: string;
  /** Filtre différenciant : une spécialité déduite (code canon, ex. "vfx"). */
  specialite?: string;
  /** Mode de travail déduit (remote / hybride / onsite). */
  mode?: ModeTravail;
  /** Recherche plein-texte simple (titre / studio / description). */
  q?: string;
  /** Page 1-indexée. */
  page?: number;
}

/** Dimension de facette qu'on peut **exclure** des conditions (pour ne pas qu'une facette se filtre elle-même). */
type DimensionFacette = "pays" | "logiciel" | "specialite";

/** Valeur sentinelle du filtre « Lieu » pour cibler les offres **sans pays** (rend visibles les NULL). */
export const SANS_PAYS = "__sans_pays__";

/**
 * Construit les conditions WHERE communes (hors `pertinence`, géré à part pour pouvoir compter chaque
 * onglet avec les mêmes filtres). `exclure` retire une dimension : utilisé par les facettes pour
 * afficher, dans leur propre sélecteur, les autres valeurs encore disponibles compte tenu des AUTRES
 * filtres actifs (faceted search standard).
 */
function conditionsCommunes(f: FiltreOffres, exclure?: DimensionFacette): SQL[] {
  const conds: SQL[] = [];

  if (f.pays && exclure !== "pays") {
    conds.push(
      f.pays === SANS_PAYS
        ? sql`(${offres.pays} is null or ${offres.pays} = '')`
        : eq(offres.pays, f.pays),
    );
  }
  if (f.contrat) conds.push(eq(offres.contrat, f.contrat));
  if (f.experience) conds.push(eq(offres.experience, f.experience));
  if (f.mode) conds.push(eq(offres.modeTravail, f.mode));
  // Colonnes text[] : containment `@>` (l'offre porte ce logiciel / cette spécialité).
  if (f.logiciel && exclure !== "logiciel") conds.push(arrayContains(offres.logiciels, [f.logiciel]));
  if (f.specialite && exclure !== "specialite") conds.push(arrayContains(offres.specialites, [f.specialite]));

  const terme = f.q?.trim();
  if (terme) {
    const motif = `%${terme}%`;
    const recherche = or(
      ilike(offres.titre, motif),
      ilike(offres.studio, motif),
      ilike(offres.description, motif),
    );
    if (recherche) conds.push(recherche);
  }

  return conds;
}

/** Résultat paginé du flux d'offres. */
export interface PageOffres {
  offres: OffreRow[];
  page: number;
  aPageSuivante: boolean;
}

/** Liste les offres d'une vue, **dédupliquées inter-sources**, triées par fraîcheur, paginées. */
export async function listerOffres(f: FiltreOffres): Promise<PageOffres> {
  const page = Math.max(1, f.page ?? 1);
  const where = and(eq(offres.pertinence, f.vue), ...conditionsCommunes(f));

  // CTE : on numérote les offres au sein de chaque groupe de doublons (même `cle_dedup`), en gardant
  // la source la plus directe puis la plus fraîche. On ne conserve ensuite que le 1er (rn = 1).
  const classees = db.$with("classees").as(
    db
      .select({
        ...getTableColumns(offres),
        rn: sql<number>`row_number() over (
          partition by ${CLE_GROUPE}
          order by ${PRIORITE_SOURCE} asc, ${offres.publieLe} desc nulls last, ${offres.recupereLe} desc
        )`.as("rn"),
      })
      .from(offres)
      .where(where),
  );

  // On demande TAILLE_PAGE + 1 pour savoir s'il existe une page suivante.
  const lignes = await db
    .with(classees)
    .select()
    .from(classees)
    .where(eq(classees.rn, 1))
    .orderBy(sql`${classees.publieLe} desc nulls last`, desc(classees.recupereLe))
    .limit(TAILLE_PAGE + 1)
    .offset((page - 1) * TAILLE_PAGE);

  const aPageSuivante = lignes.length > TAILLE_PAGE;
  return { offres: lignes.slice(0, TAILLE_PAGE), page, aPageSuivante };
}

/** Compte les offres de chaque onglet avec les filtres courants (badges d'onglets). */
export async function compterParVue(
  f: FiltreOffres,
): Promise<Record<Vue, number>> {
  const communes = conditionsCommunes(f);
  // Compte **dédupliqué** (cohérent avec l'affichage) : nb de groupes `cle_dedup` distincts par vue.
  const lignes = await db
    .select({
      pertinence: offres.pertinence,
      n: sql<number>`count(distinct ${CLE_GROUPE})::int`,
    })
    .from(offres)
    .where(
      and(
        or(eq(offres.pertinence, "coeur"), eq(offres.pertinence, "connexe")),
        ...communes,
      ),
    )
    .groupBy(offres.pertinence);

  const resultat: Record<Vue, number> = { coeur: 0, connexe: 0 };
  for (const l of lignes) {
    if (l.pertinence === "coeur" || l.pertinence === "connexe") {
      resultat[l.pertinence] = l.n;
    }
  }
  return resultat;
}

/** Nombre d'offres **en base** par source (toutes pertinences). Pour la surveillance de santé. */
export async function comptesParSource(): Promise<Record<string, number>> {
  const lignes = await db
    .select({ source: offres.source, n: count() })
    .from(offres)
    .groupBy(offres.source);
  const out: Record<string, number> = {};
  for (const l of lignes) out[l.source] = l.n;
  return out;
}

/** Une option de la facette « pays » : libellé + nombre d'offres. */
export interface FacettePays {
  pays: string;
  n: number;
}

/**
 * Liste les pays présents dans une vue (filtre géo de premier plan, R-3), **dédupliqués** (count
 * distinct des groupes `cle_dedup`, cohérent avec la liste et les badges d'onglets) et tenant compte
 * des **autres filtres actifs** (sauf le pays lui-même). Les offres sans pays sont ignorées.
 */
export async function listerPays(f: FiltreOffres): Promise<FacettePays[]> {
  const n = sql<number>`count(distinct ${CLE_GROUPE})::int`;
  const lignes = await db
    .select({ pays: sql<string | null>`${offres.pays}`, n })
    .from(offres)
    .where(and(eq(offres.pertinence, f.vue), ...conditionsCommunes(f, "pays")))
    .groupBy(offres.pays)
    .orderBy(sql`count(distinct ${CLE_GROUPE}) desc`, asc(offres.pays));

  const reels = lignes
    .filter((l): l is { pays: string; n: number } => l.pays !== null && l.pays !== "")
    .map((l) => ({ pays: l.pays, n: l.n }));
  // Entrée « Lieu non précisé » en fin de liste (rend les offres sans pays atteignables, AUDIT §D).
  const sans = lignes.find((l) => l.pays === null || l.pays === "");
  return sans && sans.n > 0 ? [...reels, { pays: SANS_PAYS, n: sans.n }] : reels;
}

/** Une option de facette « tableau » (logiciel / spécialité) : valeur canon + nombre d'offres. */
export interface FacetteTableau {
  valeur: string;
  n: number;
}

/**
 * Facette d'une colonne `text[]` (logiciels / specialites) : déplie le tableau (`unnest`) puis compte
 * les **groupes dédupliqués distincts** (`cle_dedup`) par valeur — cohérent avec la liste et les badges
 * d'onglets, pas le nombre de lignes brutes. Tient compte des **autres filtres actifs** (la dimension
 * `exclure` est retirée pour que le sélecteur garde ses autres valeurs disponibles). Trié par fréquence.
 */
async function facetteTableau(
  colonne: typeof offres.logiciels | typeof offres.specialites,
  f: FiltreOffres,
  exclure: DimensionFacette,
): Promise<FacetteTableau[]> {
  const deplie = db
    .select({
      valeur: sql<string>`unnest(${colonne})`.as("valeur"),
      groupe: sql<string>`${CLE_GROUPE}`.as("groupe"),
    })
    .from(offres)
    .where(and(eq(offres.pertinence, f.vue), ...conditionsCommunes(f, exclure)))
    .as("deplie");

  const lignes = await db
    .select({ valeur: deplie.valeur, n: sql<number>`count(distinct ${deplie.groupe})::int` })
    .from(deplie)
    .groupBy(deplie.valeur)
    .orderBy(sql`count(distinct ${deplie.groupe}) desc`, asc(deplie.valeur));

  return lignes.map((l) => ({ valeur: l.valeur, n: l.n }));
}

/** Logiciels présents dans la vue (dédupliqués, filtres actifs honorés), du plus fréquent au moins. */
export function listerLogiciels(f: FiltreOffres): Promise<FacetteTableau[]> {
  return facetteTableau(offres.logiciels, f, "logiciel");
}

/** Spécialités présentes dans la vue (dédupliquées, filtres actifs honorés), du plus fréquent au moins. */
export function listerSpecialites(f: FiltreOffres): Promise<FacetteTableau[]> {
  return facetteTableau(offres.specialites, f, "specialite");
}
