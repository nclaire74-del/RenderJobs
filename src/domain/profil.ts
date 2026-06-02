/**
 * **Profil utilisateur** — décrit la chercheuse d'emploi *dans le même vocabulaire que les offres*
 * (logiciels, spécialités, niveau, lieu, mode). C'est la clé de voûte du virage « copilote » (AUDIT §6) :
 * une fois le profil exprimé dans les dimensions des offres, le matching/scoring devient une simple
 * intersection d'ensembles — déterministe, sans compte ni ML.
 *
 * Stocké côté client en `localStorage` (sans compte, zéro RGPD) et miroité dans un cookie pour que le
 * rendu serveur puisse trier « pour moi ». Comme le cookie est une **entrée client non fiable**, il est
 * reparsé via Zod (`ProfilSchema`) avant tout usage serveur.
 */
import { z } from "zod";
import { EXPERIENCES, MODES_TRAVAIL } from "@/domain/offre";
import type { Experience, ModeTravail } from "@/domain/offre";

/** Le profil tel que saisi par l'utilisatrice. Toutes les dimensions sont optionnelles. */
export interface Profil {
  /** Spécialités visées (codes canon : "rigging", "vfx"…). */
  specialites: string[];
  /** Logiciels maîtrisés (labels canon : "Maya", "Unreal Engine"…). */
  logiciels: string[];
  /** Niveau d'expérience. */
  experience: Experience | null;
  /** Pays/lieu souhaité (libellé tel qu'affiché dans la facette : "France", "À distance"…). */
  pays: string | null;
  /** Mode de travail souhaité. */
  mode: ModeTravail | null;
}

/** Profil vide (état initial / aucune préférence). */
export const PROFIL_VIDE: Profil = {
  specialites: [],
  logiciels: [],
  experience: null,
  pays: null,
  mode: null,
};

/** Schéma Zod : valide/normalise un profil venu du cookie (entrée client non fiable). */
export const ProfilSchema = z.object({
  specialites: z.array(z.string()).max(40).default([]),
  logiciels: z.array(z.string()).max(40).default([]),
  experience: z.enum(EXPERIENCES as unknown as [Experience, ...Experience[]]).nullable().default(null),
  pays: z.string().max(60).nullable().default(null),
  mode: z.enum(MODES_TRAVAIL as unknown as [ModeTravail, ...ModeTravail[]]).nullable().default(null),
});

/** `true` si au moins une dimension est renseignée (sinon le scoring n'a aucun sens). */
export function profilRempli(p: Profil): boolean {
  return (
    p.specialites.length > 0 ||
    p.logiciels.length > 0 ||
    p.experience !== null ||
    p.pays !== null ||
    p.mode !== null
  );
}

/** Parse un profil depuis une chaîne JSON (cookie). Renvoie `null` si invalide/absente. */
export function lireProfil(json: string | undefined | null): Profil | null {
  if (!json) return null;
  try {
    const obj = ProfilSchema.safeParse(JSON.parse(json));
    return obj.success ? obj.data : null;
  } catch {
    return null;
  }
}
