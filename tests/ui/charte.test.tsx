// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { JourPropose } from "@/domain/rendez-vous";
import { Etapes } from "@/ui/Etapes";
import { JourDisponible } from "@/ui/JourDisponible";
import { Tampon } from "@/ui/Tampon";
import { TuileChoix } from "@/ui/TuileChoix";

afterEach(cleanup);

const mercredi: JourPropose = {
  id: "c1",
  date: "2026-09-30",
  moment: "matin",
  capacite: 12,
  reserves: 9,
  places: 3,
  complet: false,
  dansJours: 5,
  soleils: 5,
  libelle: "Mercredi",
  quand: "dans 5 jours",
};

describe("composants de la charte", () => {
  it("Tampon : le « VU » du carnet papier, avec un nom accessible", () => {
    render(<Tampon libelle="Vaccin fait" />);
    expect(screen.getByRole("img", { name: "Vaccin fait" }).textContent).toBe("VU");
  });

  it("Etapes : dit l'avancement en toutes lettres", () => {
    render(<Etapes numero={2} total={4} />);
    expect(screen.getByText("2 sur 4")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
  });

  it("JourDisponible : le jour, le moment, les places et les soleils", () => {
    render(<JourDisponible jour={mercredi} href="/x" />);
    const lien = screen.getByRole("link");
    expect(lien.textContent).toContain("Mercredi, le matin");
    expect(lien.textContent).toContain("3 places");
    expect(lien.textContent).toContain("dans 5 jours");
  });

  it("JourDisponible : un jour complet propose la liste d'attente", () => {
    render(<JourDisponible jour={{ ...mercredi, places: 0, complet: true }} href="/x" />);
    expect(screen.getByRole("link").textContent).toContain("Liste d'attente");
  });

  it("TuileChoix : un lien avec un mot, et un bouton écouter à côté", () => {
    render(<TuileChoix href="/x" icone="hi-syringe-vaccine" libelle="Vaccin" />);
    expect(screen.getByRole("link", { name: "Vaccin" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Écouter : Vaccin" })).toBeTruthy();
  });
});
