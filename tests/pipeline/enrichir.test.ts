import { describe, expect, it } from "vitest";
import type { Offre } from "@/domain/offre";
import { enrichir, replier, compilerMotifs, LOGICIELS_COEUR } from "@/pipeline/enrichir";

/** Fabrique une offre minimale ; on ne renseigne que titre + description pour les tests. */
function offre(titre: string, description = ""): Offre {
  return {
    id: "t:1",
    source: "t",
    sourceId: "1",
    url: "https://x",
    titre,
    studio: null,
    pays: null,
    ville: null,
    latitude: null,
    longitude: null,
    modeTravail: null,
    contrat: null,
    experience: null,
    logiciels: [],
    specialites: [],
    pertinence: "connexe",
    langue: null,
    salaire: null,
    publieLe: null,
    recupereLe: new Date(),
    description,
  };
}

describe("replier", () => {
  it("retire accents et casse", () => {
    expect(replier("Modélisation 3D")).toBe("modelisation 3d");
  });
});

describe("compilerMotifs (frontières alphanumériques)", () => {
  it("ne matche pas un sous-mot", () => {
    expect(compilerMotifs(["rig"]).test("rigueur professionnelle")).toBe(false);
    expect(compilerMotifs(["ux"]).test("de nombreux travaux")).toBe(false);
  });
  it("matche un token isolé et les tokens à chiffres/tirets", () => {
    expect(compilerMotifs(["rig"]).test("le rig du personnage")).toBe(true);
    expect(compilerMotifs(["3ds max"]).test("sous 3ds max au quotidien")).toBe(true);
    expect(compilerMotifs(["v-ray"]).test("rendu v-ray")).toBe(true);
  });
});

describe("enrichir / logiciels", () => {
  it("détecte les logiciels 3D/jeu dans la description", () => {
    const o = enrichir(offre("Artiste 3D", "Maîtrise de Blender, Maya et Unreal Engine."));
    expect(o.logiciels).toEqual(expect.arrayContaining(["Blender", "Maya", "Unreal Engine"]));
    expect(o.logiciels.every((l) => LOGICIELS_COEUR.has(l))).toBe(true);
  });
  it("distingue la suite print (non-cœur)", () => {
    const o = enrichir(offre("Graphiste", "Photoshop, Illustrator, InDesign pour du print."));
    expect(o.logiciels).toEqual(expect.arrayContaining(["Photoshop", "Illustrator", "InDesign"]));
    expect(o.logiciels.some((l) => LOGICIELS_COEUR.has(l))).toBe(false);
  });
  it("normalise les variantes (UE5, c4d)", () => {
    const o = enrichir(offre("Tech artist", "Pipeline UE5, un peu de c4d."));
    expect(o.logiciels).toEqual(expect.arrayContaining(["Unreal Engine", "Cinema 4D"]));
  });
});

describe("enrichir / spécialités, niveau, mode, langue", () => {
  it("détecte spécialités bilingues", () => {
    const o = enrichir(offre("Rigging Artist", "You will do rigging and character setup."));
    expect(o.specialites).toEqual(expect.arrayContaining(["rigging", "character"]));
  });
  it("détecte les spécialités ajoutées sur le titre (ex-angles morts)", () => {
    expect(enrichir(offre("Technical Artist H/F")).specialites).toContain("technical-art");
    expect(enrichir(offre("Senior Engine Programmer")).specialites).toContain("programmation");
    expect(enrichir(offre("Producer")).specialites).toContain("production");
    expect(enrichir(offre("Lead Writer (m/f/d)")).specialites).toContain("narration");
    expect(enrichir(offre("Infographiste (H/F)")).specialites).toContain("graphisme");
    expect(enrichir(offre("Junior UI Designer")).specialites).toContain("ui-ux");
    expect(enrichir(offre("Sound Designer")).specialites).toContain("audio");
    expect(enrichir(offre("3D Artist")).specialites).toContain("generaliste-3d");
  });
  it("matche la forme agent « level designer » (et pas seulement « level design »)", () => {
    expect(enrichir(offre("CDI Level Designer Projet Narratif")).specialites).toContain("game-design");
  });
  it("ne tague pas « ux » dans un mot quelconque (frontières)", () => {
    expect(enrichir(offre("De nombreux travaux graphiques")).specialites).not.toContain("ui-ux");
  });
  it("déduit le niveau avec priorité lead > senior > junior", () => {
    expect(enrichir(offre("Lead Animator", "senior team")).experience).toBe("lead");
    expect(enrichir(offre("Senior FX", "")).experience).toBe("senior");
    expect(enrichir(offre("Stagiaire 3D", "jeune diplômé")).experience).toBe("junior");
    expect(enrichir(offre("Animateur 3D", "")).experience).toBeNull();
  });
  it("déduit le mode de travail seulement sur signal", () => {
    expect(enrichir(offre("Artist", "Poste en full remote")).modeTravail).toBe("remote");
    expect(enrichir(offre("Artist", "Télétravail partiel possible")).modeTravail).toBe("hybride");
    expect(enrichir(offre("Artist", "Sur site à Lyon")).modeTravail).toBeNull();
  });
  it("détecte la langue dominante", () => {
    expect(enrichir(offre("Artist", "We are looking for you with our team")).langue).toBe("en");
    expect(enrichir(offre("Artiste", "Nous recherchons pour le studio avec vous")).langue).toBe("fr");
  });
  it("n'écrase pas une valeur déjà fournie par la source", () => {
    const base = { ...offre("Artist", "full remote"), modeTravail: "onsite" as const };
    expect(enrichir(base).modeTravail).toBe("onsite");
  });
});
