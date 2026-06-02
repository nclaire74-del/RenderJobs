import { describe, expect, it } from "vitest";
import type { Offre } from "@/domain/offre";
import { enrichir } from "@/pipeline/enrichir";
import { classer } from "@/pipeline/classer";

function offre(
  titre: string,
  description = "",
  signaux?: Record<string, string>,
): Offre {
  return {
    id: "t:1", source: "t", sourceId: "1", url: "https://x",
    titre, studio: null, pays: null, ville: null, latitude: null, longitude: null,
    modeTravail: null, contrat: null, experience: null,
    logiciels: [], specialites: [], pertinence: "connexe", langue: null,
    salaire: null, publieLe: null, recupereLe: new Date(), description, signaux,
  };
}

/** Classe une offre comme le fait le pipeline réel : enrichir d'abord, puis classer. */
function classerComplet(titre: string, description = "", signaux?: Record<string, string>) {
  return classer(enrichir(offre(titre, description, signaux)));
}

describe("classer / cœur — rôle ou logiciel dans le TITRE", () => {
  it("logiciel cœur dans le titre → coeur", () => {
    expect(classerComplet("Character Artist Blender (H/F)")).toBe("coeur");
  });
  it("rôle créatif 3D générique dans le titre → coeur", () => {
    expect(classerComplet("3D Generalist Artist")).toBe("coeur");
    expect(classerComplet("CDI Animateur - Animatrice 3D H/F")).toBe("coeur");
    expect(classerComplet("Facial Rigging Artist 3D F/H")).toBe("coeur");
  });
  it("vocabulaire métier net dans le titre → coeur", () => {
    expect(classerComplet("Game Designer")).toBe("coeur");
    expect(classerComplet("Compositeur VFX", "Effets visuels pour le cinéma.")).toBe("coeur");
    expect(classerComplet("Narrative Designer")).toBe("coeur");
  });
});

describe("classer / cœur — signaux structurés de la source", () => {
  it("code ROME FT NON fiable seul → connexe (FT mal-taxonomise ; le titre juge le cœur)", () => {
    // Cas réels : « Consultant SAP », « Cadre de santé » renvoyés sous un ROME jeu vidéo.
    expect(classerComplet("Développeur (H/F)", "", { rome: "M1831" })).toBe("connexe");
    expect(classerComplet("Consultant-e run sap lead f/h", "", { rome: "M1831" })).toBe("hors_scope");
  });
  it("famille AFJV craft → coeur", () => {
    expect(classerComplet("Offre studio", "", { familleMetier: "Programmation" })).toBe("coeur");
  });
  it("département ATS craft → coeur", () => {
    expect(classerComplet("Software Engineer", "", { departement: "Software Engineering" })).toBe("coeur");
  });
});

describe("classer / hors_scope — titre disqualifiant (prime sur tout)", () => {
  it("mécanique / industrie — même avec un soft cœur égaré en description", () => {
    // Cas réel : « Automaticien » promu cœur par un « Unity » traînant dans la description.
    expect(classerComplet("Automaticien H/F", "Programmation, supervision, un peu de Unity.")).toBe("hors_scope");
    expect(classerComplet("Usineur Tourneur CN H/F", "Tournage et fraisage.")).toBe("hors_scope");
    expect(classerComplet("Concepteur Mécanique 3D", "Conception sous SolidWorks et CATIA.")).toBe("hors_scope");
  });
  it("finance / gestion / enseignement", () => {
    expect(classerComplet("Conseiller Gestion de Patrimoine (H/F)")).toBe("hors_scope");
    expect(classerComplet("Comptable Général (H/F)")).toBe("hors_scope");
    expect(classerComplet("Teacher of Games Design", "Game design curriculum.")).toBe("hors_scope");
  });
  it("homonymes piégeux : « Unity » médical, « Adjunct/Educator » académique", () => {
    // « Unity » = marque d'appareil de radiothérapie ; le titre porte le contexte médical.
    expect(classerComplet("Unity MR-Linac Practice Educator", "Clinical radiotherapy training.")).toBe("hors_scope");
    expect(classerComplet("Adjunct - Animation and Visual Effects", "University faculty.")).toBe("hors_scope");
  });
  it("BTP / dev web pur / escape game", () => {
    expect(classerComplet("MACON N2/N3 (H/F)", "Travaux sur chantier.")).toBe("hors_scope");
    expect(classerComplet("Développeur PHP Laravel", "API back-end Symfony.")).toBe("hors_scope");
    expect(classerComplet("Game Master", "Animation d'escape game.")).toBe("hors_scope");
  });
});

describe("classer / hors_scope — catégorie Adzuna franchement hors-secteur", () => {
  it("teaching / finance / santé sans signal cœur fort → caché", () => {
    expect(classerComplet("Summer Camp Coordinator", "STEM activities.", { categorieAdzuna: "teaching-jobs" })).toBe("hors_scope");
    expect(classerComplet("Wealth Advisor", "", { categorieAdzuna: "accounting-finance-jobs" })).toBe("hors_scope");
  });
  it("un signal cœur FORT dans le titre survit à une mauvaise catégorie (offre mal classée à la source)", () => {
    expect(classerComplet("Unity Developer", "", { categorieAdzuna: "sales-jobs" })).toBe("coeur");
  });
});

describe("classer / hors_scope — défaut STRICT (aucun signal du secteur)", () => {
  it("offre sans aucun signal → caché (changement mode strict)", () => {
    expect(classerComplet("Designer", "Rejoignez notre équipe dynamique.")).toBe("hors_scope");
    expect(classerComplet("Senior AI Research Scientist", "Deep learning research.")).toBe("hors_scope");
    expect(classerComplet(".NET Developer", "Enterprise back-end.")).toBe("hors_scope");
  });
});

describe("classer / connexe — sources protégées + périphérie", () => {
  it("plancher de secteur : code ROME large (E1205) → connexe, jamais perdu", () => {
    expect(classerComplet("Graphiste (H/F)", "PAO, supports print.", { rome: "E1205" })).toBe("connexe");
  });
  it("logiciel cœur seulement dans la description → connexe (pas coeur)", () => {
    // Cas réel : « Senior Software Engineer » chez Unity Software (Unity égaré en description).
    expect(classerComplet("Senior Software Engineer", "We build with Unity and C#.")).toBe("connexe");
  });
  it("périphérie créative → connexe", () => {
    expect(classerComplet("Motion Designer", "After Effects pour des vidéos.")).toBe("connexe");
    expect(classerComplet("Infographiste (H/F)", "PAO et communication.")).toBe("connexe");
    expect(classerComplet("Graphic Designer", "", { categorieAdzuna: "creative-design-jobs" })).toBe("connexe");
  });
});
