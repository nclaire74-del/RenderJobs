import { describe, expect, it } from "vitest";
import { normalize, parseEtat, SOURCE } from "@/sources/80-level";

const PAGE = `<html><body>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: {
    initialState: {
      jobBoard: {
        data: {
          jobs: {
            total: 70,
            items: [
              {
                id: 3802,
                slug: "steam-capsule-art-for-golel-at-ofer-rubinstein",
                title: "Steam Capsule Art & Graphical Assets for Golel",
                date: "May 31, 2026",
                description: "<p>Golel is a first-person RPG. Skills: <b>Blender</b>.</p>",
                tags: [{ name: "Illustration", slug: "illustration" }],
                company: { id: 2624, title: "Ofer Rubinstein", website: "https://x.com" },
                city: null,
                country: "Israel",
              },
            ],
          },
        },
      },
    },
  },
})}</script>
</body></html>`;

describe("80 Level — parseEtat", () => {
  it("extrait les offres du JSON embarqué", () => {
    const jobs = parseEtat(PAGE);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toContain("Steam Capsule Art");
  });
  it("renvoie [] si pas de __NEXT_DATA__", () => {
    expect(parseEtat("<html></html>")).toEqual([]);
  });
});

describe("80 Level — normalize", () => {
  const offre = normalize(parseEtat(PAGE)[0]);

  it("mappe id, studio, pays, url depuis le slug, date", () => {
    expect(offre.source).toBe(SOURCE);
    expect(offre.sourceId).toBe("3802");
    expect(offre.studio).toBe("Ofer Rubinstein");
    expect(offre.pays).toBe("Israel");
    expect(offre.url).toBe("https://80.lv/jobs/steam-capsule-art-for-golel-at-ofer-rubinstein");
    expect(offre.publieLe?.getFullYear()).toBe(2026);
  });

  it("met description + tags (matière enrichissement)", () => {
    expect(offre.description).toContain("Blender");
    expect(offre.description).toContain("Illustration");
  });
});
