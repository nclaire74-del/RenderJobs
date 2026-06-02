import { describe, expect, it } from "vitest";
import {
  extraireSitemap,
  normalize,
  parseJobPosting,
  SOURCE,
} from "@/sources/hitmarker";

/** Échantillon réel (réduit) de `sitemap-jobs.xml`. */
const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://hitmarker.net/jobs/nvidia-technical-marketing-engineer-1730001</loc><lastmod>2026-06-02T14:07:04+01:00</lastmod></url>
  <url><loc>https://hitmarker.net/jobs/riot-games-3d-artist-1729900</loc><lastmod>2026-06-02T10:00:00+01:00</lastmod></url>
  <url><loc>https://hitmarker.net/companies/riot-games</loc><lastmod>2026-06-01T00:00:00+01:00</lastmod></url>
</urlset>`;

/** Page d'offre réelle (réduite) : un bloc Product parasite + le JobPosting. */
const PAGE = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Hitmarker","review":{}}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"3D Artist","description":"<p>Join Riot. Experience with <b>Maya</b> and ZBrush required.</p>","datePosted":"2026-05-30T00:17:25+01:00","employmentType":["FULL_TIME"],"hiringOrganization":{"@type":"Organization","name":"Riot Games"},"jobLocation":[{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Los Angeles","addressRegion":"California","addressCountry":"USA"}}]}</script>
</head><body></body></html>`;

describe("Hitmarker — extraireSitemap", () => {
  const entrees = extraireSitemap(SITEMAP);

  it("ne garde que les URLs d'offres (/jobs/), ignore /companies/", () => {
    expect(entrees).toHaveLength(2);
    expect(entrees.every((e) => e.loc.includes("/jobs/"))).toBe(true);
  });

  it("conserve l'ordre du site (récent → ancien) et le lastmod", () => {
    expect(entrees[0].loc).toContain("nvidia-technical-marketing-engineer");
    expect(entrees[0].lastmod).toBe("2026-06-02T14:07:04+01:00");
  });
});

describe("Hitmarker — parseJobPosting", () => {
  it("extrait le JobPosting en ignorant le bloc Product", () => {
    const jp = parseJobPosting(PAGE);
    expect(jp).not.toBeNull();
    expect(jp?.title).toBe("3D Artist");
    expect(jp?.["@type"]).toBe("JobPosting");
  });

  it("renvoie null si aucun JobPosting", () => {
    expect(parseJobPosting("<html><body>rien</body></html>")).toBeNull();
  });
});

describe("Hitmarker — normalize", () => {
  const jp = parseJobPosting(PAGE)!;
  const url = "https://hitmarker.net/jobs/riot-games-3d-artist-1729900";
  const offre = normalize(jp, url);

  it("dérive le sourceId depuis l'id numérique en fin d'URL", () => {
    expect(offre.source).toBe(SOURCE);
    expect(offre.sourceId).toBe("1729900");
    expect(offre.id).toBe(`${SOURCE}:1729900`);
    expect(offre.url).toBe(url);
  });

  it("lit titre, studio, lieu, contrat et date", () => {
    expect(offre.titre).toBe("3D Artist");
    expect(offre.studio).toBe("Riot Games");
    expect(offre.ville).toBe("Los Angeles");
    expect(offre.pays).toBe("États-Unis"); // normalisé via nomPays (USA → libellé FR)
    expect(offre.contrat).toBe("CDI"); // FULL_TIME
    expect(offre.publieLe?.toISOString()).toBe("2026-05-29T23:17:25.000Z");
  });

  it("nettoie la description HTML en texte (matière pour l'enrichissement)", () => {
    expect(offre.description).toContain("Maya");
    expect(offre.description).toContain("ZBrush");
    expect(offre.description).not.toContain("<p>");
  });
});
