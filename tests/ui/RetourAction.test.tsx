// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RetourAction } from "@/ui/RetourAction";

afterEach(cleanup);

describe("RetourAction", () => {
  it("confirme par un message annoncé et une vibration", () => {
    const vibrer = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrer, configurable: true });
    render(<RetourAction message="C'est noté." />);
    expect(screen.getByRole("status").textContent).toContain("C'est noté.");
    expect(vibrer).toHaveBeenCalledWith(80);
  });

  it("affiche l'action d'annulation fournie", () => {
    render(
      <RetourAction message="C'est noté.">
        <button>Annuler</button>
      </RetourAction>,
    );
    expect(screen.getByRole("button", { name: "Annuler" })).toBeTruthy();
  });
});
