import { describe, expect, it } from "vitest";
import { analyserSante, formaterAlertes } from "@/pipeline/surveillance";
import type { CollectReport } from "@/pipeline/collect";

const ok = (source: string, n: number): CollectReport => ({ source, recuperees: n, ecrites: n });
const echec = (source: string, erreur: string): CollectReport => ({ source, recuperees: 0, ecrites: 0, erreur });

describe("surveillance — analyserSante", () => {
  it("alerte quand une source a échoué (erreur)", () => {
    const a = analyserSante([echec("awn", "403 Cloudflare")], { awn: 25 });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ source: "awn", niveau: "echec" });
  });

  it("alerte 'vide suspect' quand 0 récupéré mais des offres en base", () => {
    const a = analyserSante([ok("hitmarker", 0)], { hitmarker: 140 });
    expect(a).toHaveLength(1);
    expect(a[0].niveau).toBe("vide_suspect");
  });

  it("ne pas alerter une source qui collecte normalement", () => {
    expect(analyserSante([ok("afjv", 89)], { afjv: 89 })).toHaveLength(0);
  });

  it("ne pas alerter une source neuve à 0 (rien en base → pas de régression)", () => {
    expect(analyserSante([ok("nouvelle", 0)], {})).toHaveLength(0);
    expect(analyserSante([ok("nouvelle", 0)], { nouvelle: 1 })).toHaveLength(0); // sous le seuil
  });

  it("tolère le vide d'une source à anti-bot intermittent (Indeed) mais signale son échec franc", () => {
    // 0 récupéré + offres en base : normalement « vide suspect », mais Indeed est toléré (AUDIT §F).
    expect(analyserSante([ok("indeed", 0)], { indeed: 35 })).toHaveLength(0);
    // En revanche une erreur franche reste signalée.
    expect(analyserSante([echec("indeed", "timeout")], { indeed: 35 })).toHaveLength(1);
  });

  it("agrège plusieurs alertes", () => {
    const a = analyserSante(
      [echec("awn", "x"), ok("hitmarker", 0), ok("afjv", 89)],
      { awn: 25, hitmarker: 140, afjv: 89 },
    );
    expect(a).toHaveLength(2);
    expect(formaterAlertes(a)).toContain("awn");
    expect(formaterAlertes(a)).toContain("hitmarker");
  });
});
