// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BandeauHorsLigne } from "@/ui/BandeauHorsLigne";

const reseau = vi.hoisted(() => ({ horsLigne: false }));
vi.mock("next/offline", () => ({ useOffline: () => reseau.horsLigne }));
afterEach(cleanup);

describe("BandeauHorsLigne", () => {
  it("ne dit rien quand le réseau est là", () => {
    reseau.horsLigne = false;
    render(<BandeauHorsLigne />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("prévient quand il n'y a pas de réseau", () => {
    reseau.horsLigne = true;
    render(<BandeauHorsLigne message="Pas de réseau pour le moment." />);
    expect(screen.getByRole("status").textContent).toContain("Pas de réseau pour le moment.");
  });
});
