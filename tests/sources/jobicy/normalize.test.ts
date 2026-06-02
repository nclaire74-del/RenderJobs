import { describe, expect, it } from "vitest";
import { mapExperience, normalize, parseReponse, SOURCE } from "@/sources/jobicy";

const REPONSE = {
  jobs: [
    {
      id: 145298,
      url: "https://jobicy.com/jobs/145298-senior-3d-artist",
      jobTitle: "Senior 3D Artist",
      companyName: "Indie Co",
      jobGeo: "UK",
      jobType: ["Full-Time"],
      jobLevel: "Senior",
      jobDescription: "<p>Work with <b>Blender</b>.</p>",
      pubDate: "2026-06-02T11:04:08+00:00",
      salaryMin: 50000,
      salaryMax: 70000,
      salaryCurrency: "GBP",
    },
  ],
};

describe("Jobicy — mapExperience", () => {
  it("mappe les niveaux", () => {
    expect(mapExperience("Senior")).toBe("senior");
    expect(mapExperience("Junior")).toBe("junior");
    expect(mapExperience("Manager")).toBe("lead");
    expect(mapExperience("Mid-Level")).toBe("confirme");
    expect(mapExperience(undefined)).toBeNull();
  });
});

describe("Jobicy — parseReponse + normalize", () => {
  const jobs = parseReponse(REPONSE);
  it("parse les jobs ; [] si forme invalide", () => {
    expect(jobs).toHaveLength(1);
    expect(parseReponse({ foo: 1 })).toEqual([]);
  });
  it("normalise titre, expérience, salaire, remote", () => {
    const o = normalize(jobs[0]);
    expect(o.source).toBe(SOURCE);
    expect(o.titre).toBe("Senior 3D Artist");
    expect(o.experience).toBe("senior");
    expect(o.modeTravail).toBe("remote");
    expect(o.salaire).toBe("50000-70000 GBP");
    expect(o.description).toContain("Blender");
  });
});
