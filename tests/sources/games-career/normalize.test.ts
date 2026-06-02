import { describe, expect, it } from "vitest";
import {
  lireTitre,
  normalize,
  parseFlux,
  RawItemGC,
  SOURCE,
  stripHtml,
} from "@/sources/games-career";

const FLUX = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
  <title>Games-Career</title>
  <item>
    <title><![CDATA[Studio Ouf: Senior VFX Artist (Houdini)]]></title>
    <link>https://www.games-career.com/Joboffer/33706_Senior-VFX-Artist_Studio-Ouf</link>
    <pubDate>Mon, 18 May 2026 10:48 GMT</pubDate>
    <description><![CDATA[Short teaser.]]></description>
    <guid>gc_33706</guid>
    <content:encoded><![CDATA[<p>Join us as a <strong>Senior VFX Artist</strong>.</p><ul><li>Maya &amp; Houdini pipeline</li><li>compositing under Nuke</li></ul>]]></content:encoded>
  </item>
  <item>
    <title><![CDATA[Marketing Manager without studio separator]]></title>
    <link>https://www.games-career.com/Joboffer/1_x</link>
    <guid>gc_1</guid>
  </item>
</channel></rss>`;

describe("games-career / stripHtml", () => {
  it("convertit le HTML en texte brut lisible", () => {
    const t = stripHtml("<p>Join us as a <strong>Senior VFX Artist</strong>.</p><ul><li>Maya &amp; Houdini</li></ul>");
    expect(t).toContain("Senior VFX Artist");
    expect(t).toContain("Maya & Houdini");
    expect(t).not.toContain("<");
  });
  it("renvoie null sur vide", () => {
    expect(stripHtml(undefined)).toBeNull();
  });
});

describe("games-career / lireTitre", () => {
  it("sépare studio et rôle sur le premier ': '", () => {
    expect(lireTitre("Studio Ouf: Senior VFX Artist")).toEqual({
      studio: "Studio Ouf",
      titre: "Senior VFX Artist",
    });
  });
  it("sans séparateur, tout va dans le titre", () => {
    expect(lireTitre("Marketing Manager")).toEqual({ studio: null, titre: "Marketing Manager" });
  });
});

describe("games-career / parseFlux + normalize", () => {
  it("extrait les items et privilégie content:encoded comme description", () => {
    const items = parseFlux(FLUX);
    expect(items).toHaveLength(2);

    const o = normalize(items[0]);
    expect(o.id).toBe(`${SOURCE}:gc_33706`);
    expect(o.studio).toBe("Studio Ouf");
    expect(o.titre).toBe("Senior VFX Artist (Houdini)");
    expect(o.sourceId).toBe("gc_33706");
    expect(o.url).toContain("33706");
    expect(o.publieLe).toBeInstanceOf(Date);
    // description = content:encoded nettoyé (pas le teaser court)
    expect(o.description).toContain("Houdini");
    expect(o.description).not.toContain("<");
    expect(o.pertinence).toBe("connexe"); // défaut ; le plancher s'applique côté collecte
  });

  it("tolère un item minimal sans content:encoded ni studio", () => {
    const o = normalize(parseFlux(FLUX)[1]);
    expect(o.studio).toBeNull();
    expect(o.titre).toBe("Marketing Manager without studio separator");
    expect(o.sourceId).toBe("gc_1");
  });

  it("renvoie [] sur flux cassé", () => {
    expect(parseFlux("nope")).toEqual([]);
  });

  it("le schéma coerce les champs manquants proprement", () => {
    const o = normalize(RawItemGC.parse({ title: "X: Y", link: "https://z", guid: "gc_9" }));
    expect(o.description).toBeNull();
  });
});
