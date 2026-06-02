import { describe, expect, it } from "vitest";
import { signatureDedup } from "@/pipeline/dedup";

describe("dedup — signatureDedup", () => {
  it("rapproche deux libellés équivalents (accents, casse, genre, ponctuation)", () => {
    const a = signatureDedup("Développeur Gameplay (H/F)", "Ubisoft");
    const b = signatureDedup("developpeur gameplay", "UBISOFT");
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });

  it("neutralise les marqueurs de genre variés", () => {
    expect(signatureDedup("Senior Gameplay Programmer W/M/D", "Riot")).toBe(
      signatureDedup("Senior Gameplay Programmer", "Riot"),
    );
    expect(signatureDedup("Game Designer - M - F - Nb", "Riot")).toBe(
      signatureDedup("Game Designer", "Riot"),
    );
  });

  it("distingue deux studios différents au même intitulé", () => {
    expect(signatureDedup("3D Artist", "Studio A")).not.toBe(
      signatureDedup("3D Artist", "Studio B"),
    );
  });

  it("renvoie null sans studio (jamais dédupliqué → pas de faux positif)", () => {
    expect(signatureDedup("3D Artist", null)).toBeNull();
    expect(signatureDedup("3D Artist", "")).toBeNull();
    expect(signatureDedup("3D Artist", undefined)).toBeNull();
  });

  it("forme attendue « studio::titre »", () => {
    expect(signatureDedup("Lead 3D Artist", "Vinci Games")).toBe("vinci games::lead 3d artist");
  });
});
