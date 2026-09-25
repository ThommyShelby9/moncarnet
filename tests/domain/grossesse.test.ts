import { describe, expect, it } from "vitest";
import { ajouterJours } from "@/domain/dates";
import { CODES_PLAN, suiviDeGrossesse } from "@/domain/grossesse";

const aujourdhui = "2026-09-26";

describe("suiviDeGrossesse", () => {
  it("dit la semaine, le trimestre, le terme et la taille du bébé", () => {
    const suivi = suiviDeGrossesse(ajouterJours(aujourdhui, -(37 * 7 + 2)), aujourdhui);
    expect(suivi).toMatchObject({ semaines: 37, jours: 2, trimestre: 3, joursAvantTerme: 19, terme: "2026-10-15" });
    expect(suivi.taille).toEqual({ semaine: 36, cm: 47, grammes: 2600, comme: "une igname" });
    expect(suivi.conseils[0]).toContain("Préparez la naissance");
  });

  it("change de conseils selon le trimestre", () => {
    expect(suiviDeGrossesse(ajouterJours(aujourdhui, -70), aujourdhui)).toMatchObject({ semaines: 10, trimestre: 1 });
    expect(suiviDeGrossesse(ajouterJours(aujourdhui, -70), aujourdhui).conseils[0]).toContain("fer");
    expect(suiviDeGrossesse(ajouterJours(aujourdhui, -20 * 7), aujourdhui)).toMatchObject({ trimestre: 2, taille: { comme: "une mangue" } });
  });
});

describe("plan de naissance", () => {
  it("propose six choses à préparer", () => {
    expect(CODES_PLAN).toEqual(["lieu", "transport", "accompagnant", "argent", "sac", "sang"]);
  });
});
