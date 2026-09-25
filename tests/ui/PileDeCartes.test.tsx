// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PileDeCartes } from "@/ui/PileDeCartes";

afterEach(cleanup);

describe("PileDeCartes", () => {
  it("dit où l'on est dans la pile", () => {
    render(
      <PileDeCartes titre="À faire">
        <p>Comprimé</p>
        <p>Vaccin</p>
        <p>Contrôle</p>
      </PileDeCartes>,
    );
    expect(screen.getByText("1 sur 3")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Carte précédente" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("passe à la carte suivante avec la flèche", () => {
    render(
      <PileDeCartes titre="À faire">
        <p>Comprimé</p>
        <p>Vaccin</p>
      </PileDeCartes>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Carte suivante" }));
    expect(screen.getByText("2 sur 2")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Carte suivante" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("reste dans la pile quand elle raccourcit (carte faite retirée)", () => {
    const { rerender } = render(
      <PileDeCartes titre="À faire">
        <p>Vaccin</p>
        <p>Contrôle</p>
        <p>Comprimé</p>
      </PileDeCartes>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Carte suivante" }));
    fireEvent.click(screen.getByRole("button", { name: "Carte suivante" }));
    rerender(
      <PileDeCartes titre="À faire">
        <p>Vaccin</p>
        <p>Contrôle</p>
      </PileDeCartes>,
    );
    expect(screen.getByText("2 sur 2")).toBeTruthy();
  });

  it("n'affiche pas de flèches pour une seule carte", () => {
    render(
      <PileDeCartes titre="À faire">
        <p>Comprimé</p>
      </PileDeCartes>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
