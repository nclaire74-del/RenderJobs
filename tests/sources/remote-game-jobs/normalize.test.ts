import { describe, expect, it } from "vitest";
import { normalize, parseListe, SOURCE } from "@/sources/remote-game-jobs";

/** Échantillon HTML réel (réduit) de la liste RemoteGameJobs — structure Bulma server-rendered. */
const HTML = `<!DOCTYPE html><html><body>
<!-- job list -->
<div class="job-box box has-background-light hvr-grow-shadow ">
  <a title="Edge of the World Studios is hiring 3D Environment Artist (Remote Job)" class="has-text-black" href="https://remotegamejobs.com/jobs/edge-of-the-world-studios-3d-environment-artist-remote-job">
    <article class="media">
      <div class="media-content"><div class="content"><div class="columns"><div class="column is-5">
        <strong class="f-20">3D Environment Artist<span class="is-hidden-tablet"><br></span></strong>
        <br>
        <small class="f-15">Edge of the World Studios</small>
        <div class="container is-hidden-mobile">
          <span class="m-r-15 f-15 is-hidden-mobile"><span class="icon is-small m-r-5"><i class="fas fa-file-signature"></i></span> Contract </span>
          <span class="m-r-15 is-hidden-mobile"><span class="icon is-small m-r-5"><i class="fas fa-map-pin"></i></span> Remote, Worldwide </span>
        </div>
      </div>
      <div class="column f-20 is-hidden-mobile">
        <strong><span class="tag is-warning is-normal">3D Art</span></strong>
        <strong><span class="tag is-warning is-normal">Unity</span></strong>
      </div></div></div></div>
    </article>
  </a>
</div>
<div class="job-box box has-background-light ">
  <a title="Pleasart Studios is hiring Senior Level Designer (Remote Job)" class="has-text-black" href="https://remotegamejobs.com/jobs/pleasart-studios-senior-level-designer-remote-job">
    <article class="media">
      <div class="media-content"><div class="content"><div class="columns"><div class="column is-5">
        <strong class="f-20">Senior Level Designer</strong>
        <br>
        <small class="f-15">Pleasart Studios</small>
      </div>
      <div class="column f-20 is-hidden-mobile">
        <strong><span class="tag is-warning is-normal">Unreal Engine</span></strong>
      </div></div></div></div>
    </article>
  </a>
</div>
<!-- bloc parasite sans lien d'offre : doit être ignoré -->
<div class="job-box box"><a href="https://remotegamejobs.com/about">Pas une offre</a></div>
</body></html>`;

describe("RemoteGameJobs — parseListe", () => {
  const offres = parseListe(HTML);

  it("extrait les offres et ignore les blocs sans lien /jobs/", () => {
    expect(offres).toHaveLength(2);
  });

  it("lit titre, studio, lieu, contrat et tags", () => {
    const o = offres[0];
    expect(o.titre).toBe("3D Environment Artist");
    expect(o.studio).toBe("Edge of the World Studios");
    expect(o.lieu).toContain("Remote, Worldwide");
    expect(o.contratBrut).toContain("Contract");
    expect(o.tags).toEqual(["3D Art", "Unity"]);
  });

  it("gère une offre sans lieu/contrat structuré", () => {
    const o = offres[1];
    expect(o.titre).toBe("Senior Level Designer");
    expect(o.studio).toBe("Pleasart Studios");
    expect(o.lieu).toBeNull();
    expect(o.contratBrut).toBeNull();
    expect(o.tags).toEqual(["Unreal Engine"]);
  });
});

describe("RemoteGameJobs — normalize", () => {
  const [raw] = parseListe(HTML);
  const offre = normalize(raw);

  it("dérive un sourceId stable depuis le slug d'URL", () => {
    expect(offre.source).toBe(SOURCE);
    expect(offre.sourceId).toBe("edge-of-the-world-studios-3d-environment-artist-remote-job");
    expect(offre.id).toBe(`${SOURCE}:${offre.sourceId}`);
  });

  it("force le mode remote et mappe le contrat", () => {
    expect(offre.modeTravail).toBe("remote");
    expect(offre.contrat).toBe("freelance"); // « Contract » → freelance
  });

  it("met les tags compétences dans la description (matière pour l'enrichissement)", () => {
    expect(offre.description).toContain("Unity");
    expect(offre.description).toContain("3D Art");
  });

  it("attribue la source d'origine (URL directe)", () => {
    expect(offre.url).toBe(
      "https://remotegamejobs.com/jobs/edge-of-the-world-studios-3d-environment-artist-remote-job",
    );
  });
});
