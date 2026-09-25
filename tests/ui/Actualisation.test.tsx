// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Actualisation } from "@/ui/Actualisation";

const routeur = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => routeur }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Actualisation", () => {
  it("rafraîchit la page toutes les 20 secondes", () => {
    vi.useFakeTimers();
    render(<Actualisation />);
    act(() => {
      vi.advanceTimersByTime(41_000);
    });
    expect(routeur.refresh).toHaveBeenCalledTimes(2);
  });
});
