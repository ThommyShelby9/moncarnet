// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoutonEcouter } from "@/ui/BoutonEcouter";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BoutonEcouter", () => {
  it("a un nom accessible", () => {
    const { getByRole } = render(<BoutonEcouter libelle="Écouter" source="/audio/test.mp3" />);
    expect(getByRole("button", { name: /Écouter/ })).toBeTruthy();
  });

  it("lit le fichier audio et passe en lecture", async () => {
    const lecture = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { getByRole } = render(<BoutonEcouter libelle="Écouter" source="/audio/test.mp3" />);
    fireEvent.click(getByRole("button"));
    expect(lecture).toHaveBeenCalledOnce();
    await waitFor(() => expect(getByRole("button").getAttribute("aria-pressed")).toBe("true"));
  });

  it("est désactivé sans audio ni synthèse vocale", () => {
    const { getByRole } = render(<BoutonEcouter libelle="Écouter" texte="Bonjour" />);
    expect((getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
});
