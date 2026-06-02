/**
 * `construireHref` porte l'état des filtres dans la query string (UC-2, URL partageable).
 * On verrouille surtout les filtres **différenciants** (logiciel / spécialité / mode) et
 * l'omission des valeurs par défaut (URL propre).
 */
import { describe, expect, it } from "vitest";
import { construireHref } from "@/lib/url";

describe("construireHref", () => {
  it("omet les valeurs par défaut (vue=coeur, page=1) → URL propre", () => {
    expect(construireHref({ vue: "coeur" })).toBe("/");
    expect(construireHref({ vue: "coeur", page: 1 })).toBe("/");
  });

  it("porte les filtres différenciants logiciel / spécialité / mode", () => {
    const href = construireHref({
      vue: "coeur",
      logiciel: "Unreal Engine",
      specialite: "game-design",
      mode: "remote",
    });
    expect(href).toContain("logiciel=Unreal+Engine");
    expect(href).toContain("specialite=game-design");
    expect(href).toContain("mode=remote");
  });

  it("applique un patch par-dessus les filtres courants", () => {
    const base = { vue: "connexe" as const, logiciel: "Blender", page: 3 };
    const href = construireHref(base, { page: 1, logiciel: undefined });
    expect(href).toContain("vue=connexe");
    expect(href).not.toContain("logiciel");
    expect(href).not.toContain("page");
  });

  it("conserve les filtres existants (pays, contrat, niveau) avec les nouveaux", () => {
    const href = construireHref({
      vue: "coeur",
      pays: "France",
      experience: "junior",
      specialite: "vfx",
    });
    expect(href).toContain("pays=France");
    expect(href).toContain("experience=junior");
    expect(href).toContain("specialite=vfx");
  });
});
