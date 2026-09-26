// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/soignant/actions", () => ({ prendreEnChargeAction: vi.fn() }));

import { CarteAlerte } from "@/app/soignant/CarteAlerte";

afterEach(cleanup);

const alerte = {
  id: "a1",
  patientId: "p1",
  prenom: "Awa",
  nom: "Hounkpatin",
  sexe: "F" as const,
  libelleAge: "24 ans",
  semainesGrossesse: 37,
  telephone: "+2290197000002",
  signes: ["debut_travail" as const],
  creeeLe: new Date("2026-09-26T09:00:00Z"),
  echeance: new Date("2026-09-26T09:15:00Z"),
};

describe("CarteAlerte", () => {
  it("dit qu'une alerte est en retard et qu'elle remonte à la zone", () => {
    render(<CarteAlerte alerte={alerte} maintenant={new Date("2026-09-26T09:27:00Z")} />);
    expect(screen.getByText("En retard de 12 min : signalée à la zone sanitaire.")).toBeTruthy();
  });

  it("ne dit rien de plus dans le délai", () => {
    render(<CarteAlerte alerte={alerte} maintenant={new Date("2026-09-26T09:05:00Z")} />);
    expect(screen.queryByText(/En retard/)).toBeNull();
  });
});
