// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { planNaissanceAction } = vi.hoisted(() => ({ planNaissanceAction: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/(patient)/actions", () => ({ planNaissanceAction }));

import { PlanNaissance } from "@/app/(patient)/(onglets)/grossesse/PlanNaissance";

afterEach(() => {
  cleanup();
  planNaissanceAction.mockClear();
});

describe("PlanNaissance", () => {
  it("coche une chose prête, la garde tout de suite et compte ce qui est prêt", async () => {
    render(<PlanNaissance patientId="p-awa" coches={["lieu", "accompagnant", "sac"]} />);
    expect(screen.getByText("3 sur 6")).toBeTruthy();
    const transport = screen.getByRole("checkbox", { name: /comment y aller/ });
    expect(transport.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(transport);
    expect(transport.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("4 sur 6")).toBeTruthy();
    await waitFor(() => expect(planNaissanceAction).toHaveBeenCalledWith("p-awa", ["lieu", "accompagnant", "sac", "transport"]));
  });

  it("dit quand ce n'est pas enregistré", async () => {
    planNaissanceAction.mockResolvedValueOnce({ ok: false });
    render(<PlanNaissance patientId="p-awa" coches={[]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Mon sac est prêt/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("Pas encore enregistré");
  });
});
