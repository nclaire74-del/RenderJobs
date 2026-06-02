import { describe, expect, it } from "vitest";
import {
  extraireSourceId,
  lireCategories,
  lireDescription,
  normalize,
  parseFlux,
  RawItemAfjv,
  SOURCE,
} from "@/sources/afjv";

/** Échantillon RSS réel (réduit) du flux AFJV. */
const FLUX = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
  <title>Emploi AFJV</title>
  <item>
    <title>Stage Environment Artist</title>
    <link>https://emploi.afjv.com/emploi-jeux-video/SINF1074-28926</link>
    <description>Innerspace VR recrute un(e) Environment Artist. Poste basé à Saint Ouen (93)</description>
    <pubDate>Mon, 01 Jun 2026 13:12:00 GMT</pubDate>
    <category>Stage</category>
    <category>France</category>
    <category>Infographie</category>
    <guid>https://emploi.afjv.com/emploi-jeux-video/SINF1074-28926</guid>
  </item>
  <item>
    <title>Stage QA testeur / Game Designer</title>
    <link>https://emploi.afjv.com/emploi-jeux-video/STES2196-28935</link>
    <description>Clever Trickster recrute un(e) QA testeur / Game Designer. Poste basé à Télétravail (Belgique)</description>
    <pubDate>Mon, 01 Jun 2026 09:21:44 GMT</pubDate>
    <category>Freelance</category>
    <category>Belgique</category>
    <category>Test / QA</category>
  </item>
</channel></rss>`;

describe("afjv / parseFlux", () => {
  it("extrait tous les items valides du flux", () => {
    const items = parseFlux(FLUX);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Stage Environment Artist");
    expect(items[0].category).toEqual(["Stage", "France", "Infographie"]);
  });

  it("renvoie [] sur un flux vide ou cassé", () => {
    expect(parseFlux("<rss><channel></channel></rss>")).toEqual([]);
    expect(parseFlux("pas du xml")).toEqual([]);
  });
});

describe("afjv / helpers", () => {
  it("extrait l'identifiant stable du lien", () => {
    expect(extraireSourceId("https://emploi.afjv.com/emploi-jeux-video/SINF1074-28926")).toBe(
      "SINF1074-28926",
    );
    expect(extraireSourceId("https://x/abc/DEF-1/?utm=1")).toBe("DEF-1");
  });

  it("lit contrat + pays dans les catégories", () => {
    expect(lireCategories(["Stage", "France", "Infographie"])).toEqual({
      contrat: "stage",
      pays: "France",
    });
    expect(lireCategories(["Freelance", "Belgique", "Test / QA"])).toEqual({
      contrat: "freelance",
      pays: "Belgique",
    });
    expect(lireCategories(["Conception"])).toEqual({ contrat: null, pays: null });
  });

  it("extrait studio + ville de la description", () => {
    expect(
      lireDescription("Innerspace VR recrute un(e) Environment Artist. Poste basé à Saint Ouen (93)"),
    ).toEqual({ studio: "Innerspace VR", ville: "Saint Ouen (93)" });
    expect(lireDescription(undefined)).toEqual({ studio: null, ville: null });
  });
});

describe("afjv / normalize", () => {
  it("ramène un item au type Offre", () => {
    const [item] = parseFlux(FLUX);
    const o = normalize(item);
    expect(o.id).toBe(`${SOURCE}:SINF1074-28926`);
    expect(o.source).toBe(SOURCE);
    expect(o.titre).toBe("Stage Environment Artist");
    expect(o.studio).toBe("Innerspace VR");
    expect(o.ville).toBe("Saint Ouen (93)");
    expect(o.pays).toBe("France");
    expect(o.contrat).toBe("stage");
    expect(o.url).toContain("SINF1074-28926");
    expect(o.publieLe).toBeInstanceOf(Date);
    expect(o.recupereLe).toBeInstanceOf(Date);
    // champs déduits laissés au pipeline
    expect(o.logiciels).toEqual([]);
    expect(o.pertinence).toBe("connexe");
  });

  it("retombe sur pays=France quand non précisé, et tolère un item minimal", () => {
    const o = normalize(RawItemAfjv.parse({ title: "Dev", link: "https://x/y/ID-9" }));
    expect(o.pays).toBe("France");
    expect(o.contrat).toBeNull();
    expect(o.studio).toBeNull();
    expect(o.sourceId).toBe("ID-9");
  });
});
