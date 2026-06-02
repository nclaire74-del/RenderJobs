import { describe, expect, it } from "vitest";
import { lireSocieteLieu, normalize, parseListe, SOURCE } from "@/sources/gracklehq";

const HTML = `<html><body>
<div class="joblisting">
  <a href="/rd/378118" target="_blank"> Senior UX Designer - Monopoly GO! </a>
  <div>Scopely - Seville, Spain</div>
  <div class="bottomright"> &lt;1d </div>
</div>
<div class="joblisting">
  <a href="/rd/378117" target="_blank"> Backend Staff Engineer </a>
  <div>Voodoo</div>
  <div class="bottomright"> 2d </div>
</div>
<div class="joblisting"><a href="/jobs">Back to full list</a></div>
</body></html>`;

describe("GrackleHQ — lireSocieteLieu", () => {
  it("sépare société et lieu sur le 1er « - »", () => {
    expect(lireSocieteLieu("Scopely - Seville, Spain")).toEqual({ studio: "Scopely", lieu: "Seville, Spain" });
  });
  it("sans séparateur → tout en studio", () => {
    expect(lireSocieteLieu("Voodoo")).toEqual({ studio: "Voodoo", lieu: null });
  });
});

describe("GrackleHQ — parseListe + normalize", () => {
  const offres = parseListe(HTML);

  it("extrait les offres /rd/ et ignore les liens de navigation", () => {
    expect(offres).toHaveLength(2);
  });

  it("normalise titre (sans capturer le lieu), studio, lieu, url de redirection, id", () => {
    const o = normalize(offres[0]);
    expect(o.source).toBe(SOURCE);
    expect(o.titre).toBe("Senior UX Designer - Monopoly GO!");
    expect(o.studio).toBe("Scopely");
    expect(o.ville).toBe("Seville, Spain");
    expect(o.sourceId).toBe("378118");
    expect(o.url).toBe("https://gracklehq.com/rd/378118");
  });
});
