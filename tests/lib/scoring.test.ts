/**
 * Scoring profil ↔ offre (AUDIT §6) : pur, déterministe. On vérifie le ratio score/sur, les raisons,
 * et la règle « à distance correspond à tout pays ».
 */
import { describe, expect, it } from "vitest";
import { scorer, type OffreScorable } from "@/lib/scoring";
import { PROFIL_VIDE, type Profil } from "@/domain/profil";

const offre = (o: Partial<OffreScorable>): OffreScorable => ({
  logiciels: [], specialites: [], experience: null, pays: null, modeTravail: null, ...o,
});
const profil = (p: Partial<Profil>): Profil => ({ ...PROFIL_VIDE, ...p });

describe("scorer", () => {
  it("profil vide → sur=0 (pas de scoring)", () => {
    expect(scorer(PROFIL_VIDE, offre({ logiciels: ["Maya"] }))).toMatchObject({ score: 0, sur: 0 });
  });

  it("ne compte que les dimensions renseignées", () => {
    const r = scorer(profil({ logiciels: ["Maya"] }), offre({ logiciels: ["Maya", "ZBrush"] }));
    expect(r).toMatchObject({ score: 1, sur: 1 });
    expect(r.raisons).toContain("Maya");
  });

  it("score complet 4/4 avec raisons lisibles", () => {
    const p = profil({ logiciels: ["Unreal Engine"], specialites: ["game-design"], experience: "junior", pays: "France" });
    const o = offre({ logiciels: ["Unreal Engine"], specialites: ["game-design"], experience: "junior", pays: "France" });
    const r = scorer(p, o);
    expect(r).toMatchObject({ score: 4, sur: 4 });
    expect(r.raisons).toEqual(expect.arrayContaining(["Unreal Engine", "Game design", "Junior / débutant", "France"]));
  });

  it("dimension renseignée mais non matchée → compte dans sur, pas dans score", () => {
    const r = scorer(profil({ logiciels: ["Maya"], experience: "senior" }), offre({ logiciels: ["Blender"], experience: "junior" }));
    expect(r).toMatchObject({ score: 0, sur: 2 });
  });

  it("une offre à distance correspond à n'importe quel pays souhaité", () => {
    const r = scorer(profil({ pays: "France" }), offre({ pays: "À distance" }));
    expect(r).toMatchObject({ score: 1, sur: 1 });
    expect(r.raisons).toContain("À distance");
  });

  it("intersection partielle de logiciels compte comme un match (1 point)", () => {
    const r = scorer(profil({ logiciels: ["Maya", "Houdini"] }), offre({ logiciels: ["Houdini"] }));
    expect(r.score).toBe(1);
    expect(r.raisons).toEqual(["Houdini"]);
  });
});
