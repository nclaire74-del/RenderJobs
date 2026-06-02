import { describe, expect, it } from "vitest";
import { extraireLiens, normalize, parseJobPosting, SOURCE } from "@/sources/hellowork";

const RECHERCHE = `<html><body>
  <a href="/fr-fr/emplois/66075811.html">Offre A</a>
  <a href="/fr-fr/emplois/66075811.html">Offre A (doublon)</a>
  <a href="/fr-fr/emplois/70588256.html?source=list">Offre B</a>
  <a href="/fr-fr/entreprises/celetis.html">Pas une offre</a>
</body></html>`;

const PAGE = `<html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"HelloWork"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"Animateur 3D H/F","description":"<p>Studio recherche un animateur maîtrisant <b>Maya</b>.</p>","datePosted":"2026-05-31T00:08:20Z","validThrough":"2026-06-30T00:08:20Z","employmentType":"FULL_TIME","hiringOrganization":{"@type":"Organization","name":"Celetis"},"jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressCountry":"FR","addressLocality":"Lyon"}},"baseSalary":{"@type":"MonetaryAmount","currency":"EUR","value":{"@type":"QuantitativeValue","minValue":35000,"maxValue":45000,"unitText":"YEAR"}}}</script>
</head><body></body></html>`;

describe("HelloWork — extraireLiens", () => {
  const liens = extraireLiens(RECHERCHE);
  it("déduplique et ne garde que les pages d'offres", () => {
    expect(liens).toHaveLength(2);
    expect(liens).toContain("https://www.hellowork.com/fr-fr/emplois/66075811.html");
    expect(liens.some((l) => l.includes("entreprises"))).toBe(false);
  });
});

describe("HelloWork — parseJobPosting + normalize", () => {
  const jp = parseJobPosting(PAGE)!;
  const url = "https://www.hellowork.com/fr-fr/emplois/66075811.html";
  const offre = normalize(jp, url);

  it("extrait le JobPosting en ignorant le bloc WebSite", () => {
    expect(jp.title).toBe("Animateur 3D H/F");
  });

  it("normalise sourceId, lieu FR, contrat, langue et date", () => {
    expect(offre.source).toBe(SOURCE);
    expect(offre.sourceId).toBe("66075811");
    expect(offre.pays).toBe("FR");
    expect(offre.ville).toBe("Lyon");
    expect(offre.contrat).toBe("CDI");
    expect(offre.langue).toBe("fr");
    expect(offre.studio).toBe("Celetis");
  });

  it("formate le salaire à fourchette", () => {
    expect(offre.salaire).toBe("35000-45000 EUR/year");
  });

  it("nettoie la description HTML (matière enrichissement)", () => {
    expect(offre.description).toContain("Maya");
    expect(offre.description).not.toContain("<p>");
  });
});
