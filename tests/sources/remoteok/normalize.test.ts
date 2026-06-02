import { describe, expect, it } from "vitest";
import { normalize, parseReponse, SOURCE } from "@/sources/remoteok";

const REPONSE = [
  { legal: "RemoteOK API: Please link back to remoteok.com" }, // mention légale, sans position
  {
    id: 1132999,
    position: "3D Environment Artist",
    company: "Indie Studio",
    location: "Worldwide",
    tags: ["design", "3d", "unity"],
    description: "<p>We need a <b>Blender</b> artist.</p>",
    date: "2026-06-01T08:00:02+00:00",
    url: "https://remoteOK.com/remote-jobs/3d-environment-artist-indie",
    salary_min: 60000,
    salary_max: 90000,
  },
];

describe("RemoteOK — parseReponse", () => {
  const jobs = parseReponse(REPONSE);
  it("ignore la mention légale (sans position)", () => {
    expect(jobs).toHaveLength(1);
    expect(jobs[0].position).toBe("3D Environment Artist");
  });
  it("renvoie [] si pas un tableau", () => {
    expect(parseReponse({ foo: 1 })).toEqual([]);
  });
});

describe("RemoteOK — normalize", () => {
  const offre = normalize(parseReponse(REPONSE)[0]);

  it("mappe les champs et force remote", () => {
    expect(offre.source).toBe(SOURCE);
    expect(offre.sourceId).toBe("1132999");
    expect(offre.titre).toBe("3D Environment Artist");
    expect(offre.studio).toBe("Indie Studio");
    expect(offre.ville).toBe("Worldwide");
    expect(offre.modeTravail).toBe("remote");
    expect(offre.salaire).toBe("60000-90000 USD");
  });

  it("met les tags dans la description (matière enrichissement)", () => {
    expect(offre.description).toContain("Blender");
    expect(offre.description).toContain("unity");
  });
});
