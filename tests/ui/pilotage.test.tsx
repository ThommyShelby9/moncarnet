// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CarteIndicateur } from "@/app/pilotage/CarteIndicateur";
import { ClassementZones } from "@/app/pilotage/ClassementZones";
import { vide } from "@/domain/pilotage";

afterEach(cleanup);

describe("CarteIndicateur", () => {
  it("montre le taux, l'objectif et la progression depuis le mois dernier", () => {
    render(<CarteIndicateur code="cpn4" comptage={{ numerateur: 62, denominateur: 100 }} precedent={{ numerateur: 55, denominateur: 100 }} />);
    expect(screen.getByText("62 %")).toBeTruthy();
    expect(screen.getByText("Objectif atteint")).toBeTruthy();
    expect(screen.getByText("62 sur 100 · objectif 60 %")).toBeTruthy();
    expect(screen.getByText("+7 points")).toBeTruthy();
  });

  it("écrit « Presque » dans un ambre foncé, lisible sur fond blanc (contraste AA)", () => {
    render(<CarteIndicateur code="cpn4" comptage={{ numerateur: 50, denominateur: 100 }} />);
    expect(screen.getByText("50 %").className).toContain("text-soleil-fonce");
  });

  it("masque un chiffre qui porte sur moins de 5 personnes", () => {
    render(<CarteIndicateur code="penta3" comptage={{ numerateur: 2, denominateur: 3 }} />);
    expect(screen.getByText("Masqué")).toBeTruthy();
    expect(screen.getByText("Moins de 5 personnes : chiffre masqué")).toBeTruthy();
  });
});

describe("ClassementZones", () => {
  it("classe les zones de la meilleure à celle à appuyer, les chiffres masqués à la fin", () => {
    const zone = (nom: string, numerateur: number, denominateur: number, direct = false) => ({
      zone: nom,
      departement: "Zou",
      direct,
      valeurs: { ...vide(), cpn4: { numerateur, denominateur } },
    });
    render(<ClassementZones code="cpn4" zones={[zone("B", 40, 100), zone("A", 70, 100), zone("Démo", 2, 3, true), zone("C", 55, 100)]} />);
    const lignes = screen.getAllByRole("listitem");
    expect(lignes.map((l) => within(l).getByRole("heading").textContent)).toEqual(["A", "C", "B", "Démo"]);
    expect(within(lignes[3]!).getByText("Masqué")).toBeTruthy();
    expect(within(lignes[3]!).getByText("En direct")).toBeTruthy();
  });
});
