// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CarteNationale, CarteZone } from "@/app/pilotage/Cartes";
import { ZONES_SANITAIRES } from "@/domain/geographie";
import { vide, type Valeurs } from "@/domain/pilotage";

afterEach(cleanup);

const avec = (numerateur: number, denominateur: number): Valeurs => ({ ...vide(), cpn4: { numerateur, denominateur } });
const zones = ZONES_SANITAIRES.map((z, i) => ({
  zone: z.zone,
  departement: z.departement,
  direct: z.zone === "Zogbodomey-Bohicon-Zakpota",
  valeurs: z.zone === "Bassila" ? avec(2, 3) : avec(40 + i, 100),
}));
const lien = (z: string) => `/pilotage/zones/${encodeURIComponent(z)}`;

describe("CarteNationale", () => {
  it("fait de chaque zone un lien vers sa fiche, avec sa valeur et son niveau en mots", () => {
    render(<CarteNationale code="cpn4" zones={zones} lien={lien} titre="carte" />);
    const kandi = screen.getAllByRole("link", { name: /^Kandi \/ Gogounou \/ Ségbana/ })[0]!;
    expect(kandi.getAttribute("aria-label")).toBe("Kandi / Gogounou / Ségbana : 41 %, à appuyer");
    expect(kandi.getAttribute("href")).toBe(lien("Kandi / Gogounou / Ségbana"));
  });

  it("réunit les quatre zones de Cotonou sur leur commune, et dit quand un chiffre est masqué", () => {
    render(<CarteNationale code="cpn4" zones={zones} lien={lien} titre="carte" />);
    expect(screen.getAllByRole("link", { name: /^Cotonou \(4 zones sanitaires\) : \d+ %/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Bassila : masqué (moins de 5 personnes)" }).length).toBeGreaterThan(0);
  });

  it("donne la légende en mots", () => {
    render(<CarteNationale code="cpn4" zones={zones} lien={lien} titre="carte" />);
    for (const mot of ["Objectif atteint", "Presque", "À appuyer", "Masqué", "Pas de donnée"]) expect(screen.getByText(mot)).toBeTruthy();
  });
});

describe("CarteZone", () => {
  it("écrit la valeur de chaque commune, et dit quand une commune n'a pas encore de carnets", () => {
    render(
      <CarteZone
        zone="Zogbodomey-Bohicon-Zakpota"
        code="cpn4"
        communes={[
          { nom: "Bohicon", valeurs: avec(61, 100) },
          { nom: "Zogbodomey", valeurs: avec(3, 4) },
        ]}
        lieux={[{ nom: "Centre de santé de Bohicon", type: "centre_sante", latitude: 7.1782, longitude: 2.0667 }]}
        titre="carte de la zone"
      />,
    );
    expect(screen.getByText("Bohicon : 61 %, objectif atteint")).toBeTruthy();
    expect(screen.getByText("Zogbodomey : masqué (moins de 5 personnes)")).toBeTruthy();
    expect(screen.getByText("Za-Kpota : pas de donnée")).toBeTruthy();
    expect(screen.getByText("Centre de santé de Bohicon")).toBeTruthy();
  });

  it("colore toute une zone fictive d'une seule valeur", () => {
    render(<CarteZone zone="Bassila" code="cpn4" valeurZone={avec(70, 100)} titre="carte" />);
    expect(screen.getByText("Bassila : 70 %, objectif atteint", { selector: "b" })).toBeTruthy();
  });
});
