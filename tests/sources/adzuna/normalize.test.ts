import { describe, expect, it } from "vitest";
import {
  RawOffreAdzuna,
  SOURCE,
  construireSalaire,
  mapContrat,
  normalize,
} from "@/sources/adzuna";

/** Offre brute représentative renvoyée par l'API Adzuna (+ `paysCode` injecté par le fetch). */
const brut = {
  id: 5709623337, // l'API renvoie un nombre → coercition en string
  title: "Game Developer - Midcore Games",
  description: "Studio recrute un développeur Unreal Engine pour ses jeux mobiles.",
  created: "2026-04-24T22:38:42Z",
  redirect_url: "https://www.adzuna.fr/details/5709623337?utm_medium=api",
  company: { display_name: "Voodoo" },
  location: { display_name: "Paris, Ile-de-France", area: ["France", "Ile-de-France", "Paris"] },
  latitude: 48.863839,
  longitude: 2.344631,
  contract_time: "full_time",
  paysCode: "gb", // priorité au pays interrogé, pas à location.area
};

describe("adzuna / normalize", () => {
  it("ramène une offre brute au type Offre", () => {
    const o = normalize(RawOffreAdzuna.parse(brut));
    expect(o.id).toBe(`${SOURCE}:5709623337`);
    expect(o.sourceId).toBe("5709623337");
    expect(o.source).toBe(SOURCE);
    expect(o.titre).toBe("Game Developer - Midcore Games");
    expect(o.studio).toBe("Voodoo");
    expect(o.ville).toBe("Paris, Ile-de-France");
    expect(o.latitude).toBeCloseTo(48.863839);
    expect(o.url).toContain("adzuna");
    expect(o.publieLe).toBeInstanceOf(Date);
    // pertinence par défaut conservatrice (le pipeline recalcule ensuite)
    expect(o.pertinence).toBe("connexe");
  });

  it("résout le pays depuis le code pays interrogé (prioritaire sur location.area)", () => {
    expect(normalize(RawOffreAdzuna.parse(brut)).pays).toBe("Royaume-Uni");
  });

  it("retombe sur location.area si le code pays est inconnu", () => {
    const o = normalize(RawOffreAdzuna.parse({ ...brut, paysCode: "xx" }));
    expect(o.pays).toBe("France");
  });

  it("laisse vides les champs déduits par l'enrichissement", () => {
    const o = normalize(RawOffreAdzuna.parse(brut));
    expect(o.logiciels).toEqual([]);
    expect(o.specialites).toEqual([]);
    expect(o.experience).toBeNull();
    expect(o.langue).toBeNull();
  });
});

describe("adzuna / construireSalaire", () => {
  it("formate une fourchette réelle", () => {
    expect(construireSalaire(RawOffreAdzuna.parse({ ...brut, salary_min: 35000, salary_max: 45000 }))).toBe(
      "35 000 – 45 000",
    );
  });
  it("ignore les salaires estimés par algorithme", () => {
    expect(
      construireSalaire(
        RawOffreAdzuna.parse({ ...brut, salary_min: 35000, salary_is_predicted: "1" }),
      ),
    ).toBeNull();
  });
  it("renvoie null si aucune borne", () => {
    expect(construireSalaire(RawOffreAdzuna.parse(brut))).toBeNull();
  });
});

describe("adzuna / mapContrat", () => {
  it("mappe le type de contrat Adzuna", () => {
    expect(mapContrat(RawOffreAdzuna.parse({ ...brut, contract_type: "permanent" }))).toBe("CDI");
    expect(mapContrat(RawOffreAdzuna.parse({ ...brut, contract_type: "contract" }))).toBe("CDD");
  });
  it("déduit stage/alternance/freelance depuis le titre", () => {
    expect(mapContrat(RawOffreAdzuna.parse({ ...brut, title: "3D Artist Internship" }))).toBe("stage");
    expect(mapContrat(RawOffreAdzuna.parse({ ...brut, title: "Game Dev (Freelance)" }))).toBe("freelance");
  });
  it("renvoie null quand rien n'est exploitable", () => {
    expect(mapContrat(RawOffreAdzuna.parse(brut))).toBeNull();
  });
});
