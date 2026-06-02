import { describe, expect, it } from "vitest";
import { lireTitre, normalize, parseFlux, SOURCE } from "@/sources/work-with-indies";

const FLUX = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
  <item>
    <title>Dark Dark Goose is hiring a UI Artist to work from GMT +4 to +12</title>
    <link>https://www.workwithindies.com/careers/dark-dark-goose-ui-artist</link>
    <guid>https://www.workwithindies.com/careers/dark-dark-goose-ui-artist</guid>
    <description>We're looking for a designer. Tags: [Art &amp; Animation] [Part Time]</description>
    <pubDate>Tue, 02 Jun 2026 00:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Vinci Games is hiring a Lead 3D Artist</title>
    <link>https://www.workwithindies.com/careers/vinci-games-lead-3d-artist-social-vr</link>
    <description>Tags: [Art &amp; Animation]</description>
    <pubDate>Mon, 01 Jun 2026 00:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

describe("Work With Indies — lireTitre", () => {
  it("sépare studio et rôle, coupe le préambule de lieu", () => {
    expect(lireTitre("Dark Dark Goose is hiring a UI Artist to work from GMT +4 to +12")).toEqual({
      studio: "Dark Dark Goose",
      titre: "UI Artist",
    });
  });
  it("gère un titre sans préambule", () => {
    expect(lireTitre("Vinci Games is hiring a Lead 3D Artist")).toEqual({
      studio: "Vinci Games",
      titre: "Lead 3D Artist",
    });
  });
});

describe("Work With Indies — parseFlux + normalize", () => {
  const items = parseFlux(FLUX);
  it("parse les items", () => expect(items).toHaveLength(2));
  it("normalise studio, titre, sourceId, date", () => {
    const o = normalize(items[1]);
    expect(o.source).toBe(SOURCE);
    expect(o.studio).toBe("Vinci Games");
    expect(o.titre).toBe("Lead 3D Artist");
    expect(o.sourceId).toBe("careers/vinci-games-lead-3d-artist-social-vr");
    expect(o.publieLe?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
  it("conserve les tags dans la description", () => {
    expect(normalize(items[0]).description).toContain("Art & Animation");
  });
});
