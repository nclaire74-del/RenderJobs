import { describe, expect, it } from "vitest";
import type { Offre } from "@/domain/offre";
import { traiter } from "@/pipeline/traiter";

function offre(titre: string, description = ""): Offre {
  return {
    id: "t:1", source: "t", sourceId: "1", url: "https://x",
    titre, studio: null, pays: null, ville: null, latitude: null, longitude: null,
    modeTravail: null, contrat: null, experience: null,
    logiciels: [], specialites: [], pertinence: "connexe", langue: null,
    salaire: null, publieLe: null, recupereLe: new Date(), description,
  };
}

describe("traiter", () => {
  it("enrichit ET classe en une passe", () => {
    const o = traiter(offre("Rigging Artist", "Sous Maya."));
    expect(o.logiciels).toContain("Maya");
    expect(o.pertinence).toBe("coeur");
  });

  it("le plancher empêche un rejet pour une source curée (jamais sous le plancher)", () => {
    // « Game Master » serait rejeté (escape game) par le classifieur générique…
    expect(traiter(offre("Stage Game Master", "")).pertinence).toBe("hors_scope");
    // …mais avec un plancher `connexe` (source de confiance), il est remonté.
    expect(traiter(offre("Stage Game Master", ""), { plancher: "connexe" }).pertinence).toBe("connexe");
  });

  it("le plancher ne dégrade jamais une meilleure classe", () => {
    expect(traiter(offre("VFX Artist", "compositing"), { plancher: "connexe" }).pertinence).toBe("coeur");
  });
});
