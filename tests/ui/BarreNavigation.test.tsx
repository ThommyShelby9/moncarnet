// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarreNavigation } from "@/ui/BarreNavigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/carnet" }));
afterEach(cleanup);

describe("BarreNavigation", () => {
  it("marque l'onglet de la page ouverte", () => {
    render(<BarreNavigation />);
    expect(screen.getByRole("link", { name: "Mon carnet" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Accueil" }).getAttribute("aria-current")).toBeNull();
  });

  it("a quatre onglets, chacun avec un mot", () => {
    render(<BarreNavigation />);
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual(["Accueil", "Rendez-vous", "Mon carnet", "Famille"]);
  });
});
