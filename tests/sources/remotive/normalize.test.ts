import { describe, expect, it } from "vitest";
import { normalize, parseReponse, SOURCE } from "@/sources/remotive";

const REPONSE = {
  jobs: [
    {
      id: 2090899,
      url: "https://remotive.com/remote-jobs/design/3d-artist-acme",
      title: "3D Artist",
      company_name: "Acme",
      candidate_required_location: "Worldwide",
      tags: ["3d", "blender"],
      publication_date: "2026-05-27T12:32:53",
      salary: "$60k - $80k",
      description: "<p>Make <b>3D</b> assets.</p>",
    },
  ],
};

describe("Remotive — parseReponse + normalize", () => {
  const jobs = parseReponse(REPONSE);
  it("parse les jobs ; [] si forme invalide", () => {
    expect(jobs).toHaveLength(1);
    expect(parseReponse([])).toEqual([]);
  });
  it("normalise titre, lieu, salaire, remote, tags dans la description", () => {
    const o = normalize(jobs[0]);
    expect(o.source).toBe(SOURCE);
    expect(o.titre).toBe("3D Artist");
    expect(o.ville).toBe("Worldwide");
    expect(o.modeTravail).toBe("remote");
    expect(o.salaire).toBe("$60k - $80k");
    expect(o.description).toContain("blender");
  });
});
