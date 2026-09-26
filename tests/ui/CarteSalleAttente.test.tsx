// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(patient)/actions", () => ({ arriverAction: vi.fn() }));

import { CarteSalleAttente } from "@/app/(patient)/(onglets)/CarteSalleAttente";

afterEach(cleanup);

describe("CarteSalleAttente", () => {
  it("propose de dire qu'on est arrivé", () => {
    render(<CarteSalleAttente patientId="p1" prenom={null} place={null} />);
    expect(screen.getByRole("button", { name: "Je suis arrivé au centre" })).toBeTruthy();
  });

  it("donne le numéro et le nombre de personnes avant", () => {
    render(<CarteSalleAttente patientId="p1" prenom={null} place={{ etat: "attente", numero: 12, avant: 4, bientot: false }} />);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("4 personnes avant vous")).toBeTruthy();
  });

  it("prévient quand c'est bientôt, puis quand c'est son tour", () => {
    const { rerender } = render(<CarteSalleAttente patientId="p1" prenom="Mariam" place={{ etat: "attente", numero: 12, avant: 1, bientot: true }} />);
    expect(screen.getByRole("status").textContent).toContain("C'est bientôt le tour de Mariam");
    expect(screen.getByText("1 personne avant Mariam")).toBeTruthy();
    rerender(<CarteSalleAttente patientId="p1" prenom="Mariam" place={{ etat: "appele", numero: 12 }} />);
    expect(screen.getByRole("status").textContent).toContain("C'est le tour de Mariam : entrez en consultation");
  });
});
