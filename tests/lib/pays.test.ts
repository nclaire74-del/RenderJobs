/**
 * Dérivation du pays (réparation du filtre géo, AUDIT §C). `deduirePays` est pur et central :
 * pays fourni → normalisé ; sinon déduit du lieu ; sinon « À distance » si télétravail ; sinon null.
 */
import { describe, expect, it } from "vitest";
import { nomPays, paysDepuisLieu, deduirePays, PAYS_DISTANCE } from "@/lib/pays";

describe("nomPays", () => {
  it("normalise codes ISO et libellés vers le FR", () => {
    expect(nomPays("FR")).toBe("France");
    expect(nomPays("United States")).toBe("États-Unis");
    expect(nomPays("usa")).toBe("États-Unis");
    expect(nomPays("UK")).toBe("Royaume-Uni");
  });
  it("laisse passer l'inconnu (best-effort) et gère le vide", () => {
    expect(nomPays("Wakanda")).toBe("Wakanda");
    expect(nomPays(null)).toBeNull();
    expect(nomPays("  ")).toBeNull();
  });
});

describe("paysDepuisLieu — extrait le pays d'une chaîne de lieu libre", () => {
  it("prend le dernier segment reconnu", () => {
    expect(paysDepuisLieu("San Mateo, CA, United States")).toBe("États-Unis");
    expect(paysDepuisLieu("Cary,North Carolina,United States")).toBe("États-Unis");
    expect(paysDepuisLieu("Montreal,Quebec,Canada")).toBe("Canada");
    expect(paysDepuisLieu("Gurugram, Haryana, India")).toBe("Inde");
    expect(paysDepuisLieu("São Paulo, Brazil")).toBe("Brésil");
  });
  it("gère le préfixe code ISO et la ville = pays", () => {
    expect(paysDepuisLieu("ES - Barcelona, Spain")).toBe("Espagne");
    expect(paysDepuisLieu("IN - India")).toBe("Inde");
    expect(paysDepuisLieu("Singapore")).toBe("Singapour");
    expect(paysDepuisLieu("Brighton, UK")).toBe("Royaume-Uni");
  });
  it("multi-lieux → premier ; ville seule inconnue → null", () => {
    expect(paysDepuisLieu("ES - Spain; GB - United Kingdom")).toBe("Espagne");
    expect(paysDepuisLieu("Brighton")).toBeNull();
    expect(paysDepuisLieu(null)).toBeNull();
  });
});

describe("deduirePays — ordre de fiabilité", () => {
  it("priorité au pays fourni (normalisé)", () => {
    expect(deduirePays("FR", "Lyon", null)).toBe("France");
  });
  it("déduit du lieu si pas de pays", () => {
    expect(deduirePays(null, "San Mateo, CA, United States", "hybride")).toBe("États-Unis");
  });
  it("« À distance » si télétravail et lieu inexploitable", () => {
    expect(deduirePays(null, null, "remote")).toBe(PAYS_DISTANCE);
    expect(deduirePays(null, "", "remote")).toBe(PAYS_DISTANCE);
  });
  it("null si lieu inconnu et pas remote", () => {
    expect(deduirePays(null, "Brighton", "hybride")).toBeNull();
    expect(deduirePays(null, null, null)).toBeNull();
  });
});
