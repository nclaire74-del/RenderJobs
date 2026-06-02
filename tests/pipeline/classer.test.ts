import { describe, expect, it } from "vitest";
import type { Offre } from "@/domain/offre";
import { enrichir } from "@/pipeline/enrichir";
import { classer } from "@/pipeline/classer";

function offre(titre: string, description = ""): Offre {
  return {
    id: "t:1", source: "t", sourceId: "1", url: "https://x",
    titre, studio: null, pays: null, ville: null, latitude: null, longitude: null,
    modeTravail: null, contrat: null, experience: null,
    logiciels: [], specialites: [], pertinence: "connexe", langue: null,
    salaire: null, publieLe: null, recupereLe: new Date(), description,
  };
}

/** Classe une offre comme le fait le pipeline réel : enrichir d'abord, puis classer. */
function classerComplet(titre: string, description = "") {
  return classer(enrichir(offre(titre, description)));
}

describe("classer / cœur", () => {
  it("un logiciel 3D/jeu détecté → coeur", () => {
    expect(classerComplet("Artiste 3D", "Sous Houdini et Maya.")).toBe("coeur");
  });
  it("vocabulaire métier net sans logiciel → coeur", () => {
    expect(classerComplet("Game Designer", "Conception gameplay et level design.")).toBe("coeur");
    expect(classerComplet("Compositeur VFX", "Effets visuels pour le cinéma.")).toBe("coeur");
  });
  it("capte les variantes -er (level designer, narrative designer)", () => {
    expect(classerComplet("Stage Game / Level Designer", "")).toBe("coeur");
    expect(classerComplet("Narrative Designer", "")).toBe("coeur");
  });
  it("un soft cœur prime sur un terme de bruit (jamais rejeté à tort)", () => {
    // mentionne « impression 3D » (bruit) MAIS aussi Blender (cœur) → reste coeur.
    expect(classerComplet("Artiste 3D", "Blender ; bonus : impression 3D au studio.")).toBe("coeur");
  });
});

describe("classer / hors_scope (bruit indiscutable, barre haute)", () => {
  it("BTP / manuel", () => {
    expect(classerComplet("MACON N2/N3 (H/F)", "Travaux de maçonnerie sur chantier.")).toBe("hors_scope");
    expect(classerComplet("Cariste 3 (H/F)", "Préparation de commandes.")).toBe("hors_scope");
  });
  it("mécanique / CAO industrielle", () => {
    expect(classerComplet("Concepteur Mécanique 3D", "Conception sous SolidWorks et CATIA.")).toBe("hors_scope");
    expect(classerComplet("Consultant 3DX", "Déploiement 3DEXPERIENCE Dassault.")).toBe("hors_scope");
  });
  it("impression 3D / dev web pur / escape game", () => {
    expect(classerComplet("Chef de projet impression 3D", "Parc d'imprimantes 3D.")).toBe("hors_scope");
    expect(classerComplet("Développeur PHP Laravel", "API back-end Symfony.")).toBe("hors_scope");
    expect(classerComplet("Game Master", "Animation d'escape game.")).toBe("hors_scope");
  });
});

describe("classer / connexe (la zone grise — le doute profite à l'offre)", () => {
  it("graphiste / infographiste générique → connexe (jamais rejeté)", () => {
    expect(classerComplet("Designer graphique (H/F)", "Photoshop, Illustrator, InDesign, print.")).toBe("connexe");
    expect(classerComplet("Infographiste (H/F)", "PAO et supports de communication.")).toBe("connexe");
  });
  it("motion design → connexe", () => {
    expect(classerComplet("Motion Designer", "After Effects pour des vidéos.")).toBe("connexe");
  });
  it("offre pauvre, aucun signal → connexe (montrée)", () => {
    expect(classerComplet("Designer", "Rejoignez notre équipe dynamique.")).toBe("connexe");
  });
});
