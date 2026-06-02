import { describe, expect, it } from "vitest";
import { seuilPurge } from "@/pipeline/peremption";

describe("purge — seuilPurge", () => {
  const maintenant = new Date("2026-06-02T12:00:00.000Z");

  it("calcule le seuil par défaut à 30 jours en arrière", () => {
    expect(seuilPurge(maintenant).toISOString()).toBe("2026-05-03T12:00:00.000Z");
  });

  it("respecte un joursMax personnalisé", () => {
    expect(seuilPurge(maintenant, 7).toISOString()).toBe("2026-05-26T12:00:00.000Z");
  });

  it("une offre revue récemment est au-dessus du seuil (non purgée)", () => {
    const seuil = seuilPurge(maintenant, 30);
    const recente = new Date("2026-06-01T12:00:00.000Z"); // hier
    const morte = new Date("2026-04-01T12:00:00.000Z"); // > 30 j
    expect(recente.getTime()).toBeGreaterThan(seuil.getTime());
    expect(morte.getTime()).toBeLessThan(seuil.getTime());
  });
});
