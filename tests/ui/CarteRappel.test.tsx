// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(patient)/actions", () => ({ repondreRappelAction: vi.fn() }));

import { CarteRappel } from "@/app/(patient)/(onglets)/CarteRappel";

afterEach(cleanup);

describe("CarteRappel", () => {
  it("rappelle le rendez-vous et propose les deux réponses", () => {
    render(<CarteRappel rappelId="r1" pour="Sèna" vaccin date="2026-09-30" moment="matin" canal="whatsapp" />);
    expect(screen.getByText("Rappel pour Sèna : vaccin mercredi 30 septembre, le matin")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Je viendrai" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Je ne peux pas" })).toBeTruthy();
    expect(screen.getByText(/Reçu aussi par WhatsApp \(simulé\)/)).toBeTruthy();
  });

  it("parle de rendez-vous, jamais de la maladie", () => {
    render(<CarteRappel rappelId="r1" pour={null} vaccin={false} date="2026-10-01" moment="matin" canal="sms" />);
    expect(screen.getByText("Rappel : rendez-vous jeudi 1er octobre, le matin")).toBeTruthy();
  });
});
