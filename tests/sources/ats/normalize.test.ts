import { describe, expect, it } from "vitest";
import { mapContrat, normalize, type OffreAts } from "@/sources/ats";
import { traiter } from "@/pipeline/traiter";

function offreAts(p: Partial<OffreAts> = {}): OffreAts {
  return {
    ats: "greenhouse", slug: "riotgames", studioNom: "Riot Games",
    id: "123", titre: "Software Engineer", url: "https://x/123",
    description: null, lieu: "Los Angeles", pays: null,
    departement: null, engagement: null, remote: null, publieLe: null,
    ...p,
  };
}

describe("ats / mapContrat", () => {
  it("internship / stage → stage (engagement ou titre)", () => {
    expect(mapContrat("Internship", "X")).toBe("stage");
    expect(mapContrat(null, "Environment Art Intern")).toBe("stage");
  });
  it("contract → freelance, temporary/fixed term → CDD, permanent/fulltime → CDI", () => {
    expect(mapContrat("Contract", "X")).toBe("freelance");
    expect(mapContrat("Fixed Term", "X")).toBe("CDD");
    expect(mapContrat("FullTime", "X")).toBe("CDI");
    expect(mapContrat(null, "Senior Artist")).toBeNull();
  });
});

describe("ats / normalize", () => {
  it("construit un id source stable et transporte le département en signal", () => {
    const o = normalize(offreAts({ id: "7", slug: "voodoo", departement: "Art · Characters" }));
    expect(o.id).toBe("ats:voodoo:7");
    expect(o.sourceId).toBe("voodoo:7");
    expect(o.source).toBe("ats");
    expect(o.signaux).toEqual({ departement: "Art · Characters" });
  });
  it("remote explicite → modeTravail remote ; sinon null", () => {
    expect(normalize(offreAts({ remote: true })).modeTravail).toBe("remote");
    expect(normalize(offreAts({ remote: null })).modeTravail).toBeNull();
  });
});

describe("ats / intégration tri (département pilote la pertinence)", () => {
  it("département craft jeu → coeur", () => {
    const o = traiter(normalize(offreAts({ titre: "Producer", departement: "Animation" })), { plancher: "connexe" });
    expect(o.pertinence).toBe("coeur");
  });
  it("département corporate → connexe (plancher studio connu, jamais perdu)", () => {
    const o = traiter(normalize(offreAts({ titre: "Account Manager", departement: "BeReal · Sales" })), { plancher: "connexe" });
    expect(o.pertinence).toBe("connexe");
  });
  it("ingénieur générique (dept « Engineering ») → connexe, pas cœur (board 3D/jeu, pas SaaS)", () => {
    const o = traiter(normalize(offreAts({ titre: "Senior Software Engineer, Database Infrastructure", departement: "Engineering" })), { plancher: "connexe" });
    expect(o.pertinence).toBe("connexe");
  });
  it("titre craft clair → coeur même sans département utile", () => {
    const o = traiter(normalize(offreAts({ titre: "Senior Character Artist", departement: "MonopolyGo" })), { plancher: "connexe" });
    expect(o.pertinence).toBe("coeur");
  });
});
