// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompteARebours } from "@/ui/CompteARebours";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CompteARebours", () => {
  it("dit les minutes qui restent et les fait défiler", () => {
    const maintenant = "2026-09-25T08:43:00.000Z";
    vi.useFakeTimers({ now: new Date(maintenant) });
    render(<CompteARebours echeance="2026-09-25T08:56:00.000Z" maintenant={maintenant} />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe("Reste 13 minutes");
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe("Reste 12 minutes");
  });

  it("dit le retard quand le délai est dépassé", () => {
    vi.useFakeTimers({ now: new Date("2026-09-25T09:00:00.000Z") });
    render(<CompteARebours echeance="2026-09-25T08:56:00.000Z" maintenant="2026-09-25T09:00:00.000Z" />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe("Délai dépassé de 4 minutes");
  });
});
