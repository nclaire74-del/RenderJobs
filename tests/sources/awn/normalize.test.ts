import { describe, expect, it } from "vitest";
import { normalize, parseListe, SOURCE } from "@/sources/awn";

/** Échantillon réel (réduit) du HTML rendu d'AWN. */
const HTML = `<html><body>
<div class="job-main-data">
  <input type="hidden" name="job_id" value="84407205">
  <div class="job-details">
    <div class="job-detail-row">
      <div class="job-title" aria-label="Job Title">
        <a href="/job/senior-3d-animator/84407205/" title="Senior 3D Animator">Senior 3D Animator</a>
      </div>
    </div>
    <div class="job-company-row" aria-label="Hiring Company"> Pixar </div>
    <div class="job-subtext-row">
      <div class="job-location" aria-label="Job Location"> Emeryville, California, United States (on-site) </div>
    </div>
  </div>
</div>
<div class="job-main-data">
  <div class="job-title"><a href="/job/search/">Job Search</a></div>
</div>
</body></html>`;

describe("AWN — parseListe", () => {
  const offres = parseListe(HTML);

  it("extrait les offres et ignore les liens non-offres (/job/search/)", () => {
    expect(offres).toHaveLength(1);
  });

  it("lit titre, studio, lieu, id depuis l'URL", () => {
    const o = offres[0];
    expect(o.titre).toBe("Senior 3D Animator");
    expect(o.studio).toBe("Pixar");
    expect(o.lieu).toContain("Emeryville");
    expect(o.sourceId).toBe("84407205");
    expect(o.url).toBe("https://jobs.awn.com/job/senior-3d-animator/84407205/");
  });
});

describe("AWN — normalize", () => {
  it("ramène au type Offre (ville = lieu libre, attribution URL)", () => {
    const o = normalize(parseListe(HTML)[0]);
    expect(o.source).toBe(SOURCE);
    expect(o.id).toBe(`${SOURCE}:84407205`);
    expect(o.ville).toContain("Emeryville");
    expect(o.url).toContain("jobs.awn.com/job/");
  });
});
