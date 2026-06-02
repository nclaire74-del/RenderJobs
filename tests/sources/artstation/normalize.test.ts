import { describe, expect, it } from "vitest";
import { mapLevel, normalize, parseReponse, SOURCE } from "@/sources/artstation";

const REPONSE = {
  total_count: 2,
  data: [
    {
      hash_id: "Gvq3",
      title: "Senior Environment Artist",
      description: "<p>Build worlds with <b>Unreal</b>.</p>",
      about: "Great studio.",
      skills: "Unreal, Maya",
      company_name: "Triumph Arcade",
      job_type: "permanent",
      level: "senior",
      work_remotely: true,
      created_at: "2026-06-02T00:40:51+00:00",
      salary_range: { min_salary: 60000, max_salary: 100000, currency: "USD", period: "year" },
      recruitment_localities: [{ locality: { country_name: "United States", city_name: "Austin" } }],
    },
    { title: "sans hash → ignoré" },
  ],
};

describe("ArtStation — mapLevel", () => {
  it("mappe les niveaux", () => {
    expect(mapLevel("senior")).toBe("senior");
    expect(mapLevel("middle")).toBe("confirme");
    expect(mapLevel("entry")).toBe("junior");
    expect(mapLevel("director")).toBe("lead");
  });
});

describe("ArtStation — parseReponse + normalize", () => {
  const jobs = parseReponse(REPONSE);
  it("parse les jobs valides (ignore ceux sans hash_id)", () => {
    expect(jobs).toHaveLength(1);
  });

  it("normalise url (hash_id), remote, contrat, niveau, salaire, pays", () => {
    const o = normalize(jobs[0]);
    expect(o.source).toBe(SOURCE);
    expect(o.sourceId).toBe("Gvq3");
    expect(o.url).toBe("https://www.artstation.com/jobs/Gvq3");
    expect(o.titre).toBe("Senior Environment Artist");
    expect(o.studio).toBe("Triumph Arcade");
    expect(o.modeTravail).toBe("remote");
    expect(o.contrat).toBe("CDI"); // permanent
    expect(o.experience).toBe("senior");
    expect(o.salaire).toBe("60000-100000 USD/year");
    expect(o.pays).toBe("United States");
    expect(o.ville).toBe("Austin");
  });

  it("nettoie la description (desc + about + skills)", () => {
    const o = normalize(jobs[0]);
    expect(o.description).toContain("Unreal");
    expect(o.description).toContain("Maya");
    expect(o.description).not.toContain("<p>");
  });
});
