import { describe, expect, it } from "vitest";
import { lireTitre, normalize, parseFlux, SOURCE } from "@/sources/gamejobs-co";

const FLUX = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>GameJobs.co</title>
  <entry>
    <title>Lead Game Designer - Glow at CrazyLabs</title>
    <id>https://gamejobs.co/Lead-Game-Designer-Glow-at-CrazyLabs</id>
    <link rel="alternate" href="https://gamejobs.co/Lead-Game-Designer-Glow-at-CrazyLabs"></link>
    <updated>2026-06-02T11:16:02+00:00</updated>
  </entry>
  <entry>
    <title>Studio Game Artist Lead at Gameloft</title>
    <id>https://gamejobs.co/Studio-Game-Artist-Lead-at-Gameloft</id>
    <updated>2026-06-02T11:15:51+00:00</updated>
  </entry>
</feed>`;

describe("GameJobs.co — lireTitre", () => {
  it("coupe sur le dernier « at » → rôle + studio", () => {
    expect(lireTitre("Lead Game Designer - Glow at CrazyLabs")).toEqual({
      titre: "Lead Game Designer - Glow",
      studio: "CrazyLabs",
    });
  });
  it("sans « at » → tout dans le titre", () => {
    expect(lireTitre("Generaliste")).toEqual({ titre: "Generaliste", studio: null });
  });
});

describe("GameJobs.co — parseFlux + normalize", () => {
  const entrees = parseFlux(FLUX);

  it("parse les entrées Atom", () => {
    expect(entrees).toHaveLength(2);
  });

  it("normalise titre, studio, url, date et sourceId depuis l'id", () => {
    const o = normalize(entrees[1]);
    expect(o.source).toBe(SOURCE);
    expect(o.titre).toBe("Studio Game Artist Lead");
    expect(o.studio).toBe("Gameloft");
    expect(o.sourceId).toBe("Studio-Game-Artist-Lead-at-Gameloft");
    expect(o.url).toBe("https://gamejobs.co/Studio-Game-Artist-Lead-at-Gameloft");
    expect(o.publieLe?.toISOString()).toBe("2026-06-02T11:15:51.000Z");
  });
});
