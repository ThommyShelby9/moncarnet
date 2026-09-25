// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { seDeconnecter } = vi.hoisted(() => ({ seDeconnecter: vi.fn(async () => {}) }));
vi.mock("@/app/actions-session", () => ({ seDeconnecter }));

import { BoutonDeconnexion } from "@/ui/BoutonDeconnexion";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  seDeconnecter.mockClear();
});

describe("BoutonDeconnexion", () => {
  it("efface les pages gardées sur le téléphone, puis déconnecte", async () => {
    const supprimer = vi.fn(async () => true);
    vi.stubGlobal("caches", { delete: supprimer });
    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    await waitFor(() => expect(seDeconnecter).toHaveBeenCalled());
    expect(supprimer).toHaveBeenCalledWith("mc-pages");
  });

  it("reste connecté et dit pourquoi quand des saisies attendent le réseau", async () => {
    render(<BoutonDeconnexion avantDeconnexion={async () => "2 visites attendent le réseau."} />);
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect((await screen.findByRole("alert")).textContent).toContain("2 visites attendent le réseau.");
    expect(seDeconnecter).not.toHaveBeenCalled();
  });

  it("garde un nom accessible en version pictogramme seul", () => {
    render(<BoutonDeconnexion compact />);
    expect(screen.getByRole("button", { name: "Se déconnecter" }).textContent).toBe("");
  });
});
