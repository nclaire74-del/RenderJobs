import { describe, expect, it } from "vitest";
import { normalize, RawOffreFT, SOURCE } from "@/sources/france-travail";

/** Offre brute représentative renvoyée par l'API France Travail. */
const brutComplet = {
  id: "189ABCD",
  intitule: "Infographiste 3D Jeu Vidéo (H/F)",
  description: "Création d'assets 3D sous Blender et Unreal Engine.",
  dateCreation: "2026-05-20T09:30:00.000Z",
  dateActualisation: "2026-05-22T10:00:00.000Z",
  lieuTravail: {
    libelle: "75 - Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    codePostal: "75001",
    commune: "75101", // l'API renvoie le code INSEE, pas le nom
  },
  entreprise: { nom: "Studio Pixel" },
  typeContrat: "CDI",
  natureContrat: "Contrat à durée indéterminée",
  salaire: { libelle: "35 000 - 45 000 EUR/an" },
  origineOffre: { urlOrigine: "https://candidat.francetravail.fr/offres/recherche/detail/189ABCD" },
  champEnTrop: "doit être ignoré",
};

describe("france-travail / normalize", () => {
  it("ramène une offre brute complète au type Offre", () => {
    const raw = RawOffreFT.parse(brutComplet);
    const o = normalize(raw);

    expect(o.id).toBe(`${SOURCE}:189ABCD`);
    expect(o.source).toBe(SOURCE);
    expect(o.sourceId).toBe("189ABCD");
    expect(o.titre).toBe("Infographiste 3D Jeu Vidéo (H/F)");
    expect(o.studio).toBe("Studio Pixel");
    expect(o.ville).toBe("75 - Paris"); // libelle lisible, pas le code INSEE
    expect(o.pays).toBe("France");
    expect(o.latitude).toBeCloseTo(48.8566);
    expect(o.contrat).toBe("CDI");
    expect(o.salaire).toBe("35 000 - 45 000 EUR/an");
    expect(o.url).toContain("189ABCD");
    expect(o.publieLe).toBeInstanceOf(Date);
    expect(o.recupereLe).toBeInstanceOf(Date);
  });

  it("laisse vides les champs déduits (enrichissement séparé)", () => {
    const o = normalize(RawOffreFT.parse(brutComplet));
    expect(o.experience).toBeNull();
    expect(o.modeTravail).toBeNull();
    expect(o.logiciels).toEqual([]);
    expect(o.specialites).toEqual([]);
  });

  it("tolère une offre minimale (champs optionnels absents)", () => {
    const raw = RawOffreFT.parse({ id: "X1", intitule: "Animateur 2D" });
    const o = normalize(raw);
    expect(o.studio).toBeNull();
    expect(o.ville).toBeNull();
    expect(o.contrat).toBeNull();
    expect(o.salaire).toBeNull();
    expect(o.publieLe).toBeNull();
    // url de repli construite à partir de l'id
    expect(o.url).toContain("X1");
  });

  it("mappe l'alternance via natureContrat", () => {
    const raw = RawOffreFT.parse({
      id: "X2",
      intitule: "Alternant 3D",
      typeContrat: "CDD",
      natureContrat: "Contrat d'apprentissage",
    });
    expect(normalize(raw).contrat).toBe("alternance");
  });

  it("rejette une offre sans id ni intitulé", () => {
    expect(RawOffreFT.safeParse({ intitule: "sans id" }).success).toBe(false);
    expect(RawOffreFT.safeParse({ id: "x" }).success).toBe(false);
  });
});
