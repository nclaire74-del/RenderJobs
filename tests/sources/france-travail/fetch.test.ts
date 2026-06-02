import { describe, expect, it } from "vitest";
import { parseContentRangeTotal } from "@/sources/france-travail";
import { SECTEUR_ACTIF } from "@/config/secteur-actif";

describe("france-travail / parseContentRangeTotal", () => {
  it("extrait le total de l'en-tête Content-Range", () => {
    expect(parseContentRangeTotal("offres 0-49/208")).toBe(208);
    expect(parseContentRangeTotal("offres 0-0/1")).toBe(1);
    expect(parseContentRangeTotal("offres 150-299/287543")).toBe(287543);
  });

  it("renvoie null si l'en-tête est absent ou illisible", () => {
    expect(parseContentRangeTotal(null)).toBeNull();
    expect(parseContentRangeTotal("")).toBeNull();
    expect(parseContentRangeTotal("offres */")).toBeNull();
  });
});

describe("config / secteur actif", () => {
  it("définit au moins un code ROME (filtre principal)", () => {
    expect(SECTEUR_ACTIF.codesRome.length).toBeGreaterThan(0);
    expect(SECTEUR_ACTIF.id).toBeTruthy();
  });
});
