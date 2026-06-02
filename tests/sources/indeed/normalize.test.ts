import { describe, expect, it } from "vitest";
import { normalize, parseListe, SOURCE } from "@/sources/indeed";

const HTML = `<html><body>
<div class="job_seen_beacon">
  <h2 class="jobTitle"><a data-jk="abc123"><span title="Game Designer">Game Designer</span></a></h2>
  <span data-testid="company-name">Ubisoft</span>
  <div data-testid="text-location">Montpellier (34)</div>
</div>
<div class="job_seen_beacon">
  <h2 class="jobTitle"><a data-jk="abc123"><span>Game Designer (doublon jk)</span></a></h2>
  <span data-testid="company-name">Ubisoft</span>
</div>
<div class="job_seen_beacon">
  <h3 class="jobTitle"><a data-jk="def456"><span>Infographiste 3D</span></a></h3>
  <span data-testid="company-name">Studio X</span>
  <div data-testid="text-location">Paris</div>
</div>
</body></html>`;

describe("Indeed — parseListe", () => {
  const offres = parseListe(HTML);

  it("extrait les cartes et déduplique par data-jk", () => {
    expect(offres).toHaveLength(2);
    expect(offres.map((o) => o.jk)).toEqual(["abc123", "def456"]);
  });

  it("lit titre, société, lieu", () => {
    expect(offres[0]).toMatchObject({ titre: "Game Designer", studio: "Ubisoft", lieu: "Montpellier (34)" });
  });
});

describe("Indeed — normalize", () => {
  it("construit l'URL canonique viewjob + pays/langue FR", () => {
    const o = normalize(parseListe(HTML)[1]);
    expect(o.source).toBe(SOURCE);
    expect(o.sourceId).toBe("def456");
    expect(o.url).toBe("https://fr.indeed.com/viewjob?jk=def456");
    expect(o.pays).toBe("FR");
    expect(o.langue).toBe("fr");
  });
});
