import { describe, expect, it } from "vitest";
import { normalize, parseFlux, SOURCE } from "@/sources/pixelcareer";

const FLUX = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>Senior UI Technical Artist</title>
    <link>https://www.pixelcareer.com/jobs/technical-artist-canada-2/</link>
    <pubDate>Sat, 30 May 2026 05:36:19 +0000</pubDate>
    <guid isPermaLink="false">https://www.pixelcareer.com/?post_type=job&#038;p=2573</guid>
    <description><![CDATA[<p>2K Sports Lab is seeking a Senior Technical Artist with <b>Maya</b>.</p>]]></description>
  </item>
</channel></rss>`;

describe("PixelCareer — parseFlux + normalize", () => {
  const items = parseFlux(FLUX);
  it("parse l'item", () => expect(items).toHaveLength(1));

  it("normalise titre, sourceId (depuis le link), date", () => {
    const o = normalize(items[0]);
    expect(o.source).toBe(SOURCE);
    expect(o.titre).toBe("Senior UI Technical Artist");
    expect(o.sourceId).toBe("jobs/technical-artist-canada-2");
    expect(o.url).toBe("https://www.pixelcareer.com/jobs/technical-artist-canada-2/");
    expect(o.publieLe?.toISOString()).toBe("2026-05-30T05:36:19.000Z");
  });

  it("nettoie la description HTML (matière enrichissement)", () => {
    const o = normalize(items[0]);
    expect(o.description).toContain("Maya");
    expect(o.description).not.toContain("<p>");
  });
});
