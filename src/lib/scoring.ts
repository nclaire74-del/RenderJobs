/**
 * **Scoring de correspondance profil ↔ offre** (AUDIT §6, innovation n°2 — *le* différenciateur).
 *
 * Pur calcul déterministe, sans ML : pour chaque dimension que l'utilisatrice a renseignée dans son
 * profil, on regarde si l'offre correspond. Le score est un ratio « points / dimensions renseignées »
 * (ex. 4/5), accompagné des **raisons** concrètes (« Maya, rigging, junior, France ») affichées sur la
 * carte. Seules les dimensions remplies comptent (`sur`), pour ne pas pénaliser un profil partiel.
 */
import type { Profil } from "@/domain/profil";
import { PAYS_DISTANCE } from "@/lib/pays";
import { libelleExperience, libelleMode, libelleSpecialite } from "@/lib/i18n";

/** Sous-ensemble d'offre nécessaire au scoring (compatible `Offre` et `OffreRow`). */
export interface OffreScorable {
  logiciels: string[];
  specialites: string[];
  experience: string | null;
  pays: string | null;
  modeTravail: string | null;
}

export interface Correspondance {
  /** Points obtenus (dimensions qui matchent). */
  score: number;
  /** Dimensions renseignées dans le profil (le dénominateur). 0 = profil vide → pas de scoring. */
  sur: number;
  /** Libellés des correspondances, pour affichage (« Maya », « rigging », « Junior », « France »). */
  raisons: string[];
}

const intersection = (a: string[], b: string[]): string[] => {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
};

/**
 * Calcule la correspondance entre un profil et une offre. Déterministe et pur.
 * Règle pays : une offre **à distance** correspond à n'importe quel pays souhaité (le télétravail
 * convient partout).
 */
export function scorer(profil: Profil, offre: OffreScorable): Correspondance {
  let score = 0;
  let sur = 0;
  const raisons: string[] = [];

  if (profil.logiciels.length > 0) {
    sur++;
    const communs = intersection(profil.logiciels, offre.logiciels);
    if (communs.length > 0) {
      score++;
      raisons.push(...communs);
    }
  }

  if (profil.specialites.length > 0) {
    sur++;
    const communs = intersection(profil.specialites, offre.specialites);
    if (communs.length > 0) {
      score++;
      raisons.push(...communs.map(libelleSpecialite));
    }
  }

  if (profil.experience) {
    sur++;
    if (offre.experience === profil.experience) {
      score++;
      raisons.push(libelleExperience(profil.experience));
    }
  }

  if (profil.pays) {
    sur++;
    if (offre.pays === profil.pays || offre.pays === PAYS_DISTANCE) {
      score++;
      raisons.push(offre.pays === PAYS_DISTANCE ? PAYS_DISTANCE : profil.pays);
    }
  }

  if (profil.mode) {
    sur++;
    if (offre.modeTravail === profil.mode) {
      score++;
      raisons.push(libelleMode(profil.mode));
    }
  }

  return { score, sur, raisons };
}
