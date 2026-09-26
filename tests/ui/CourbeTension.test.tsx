// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CourbeTension } from "@/ui/CourbeTension";

afterEach(cleanup);

const releves = [
  { date: "2026-05-28", sys: 150, dia: 95 },
  { date: "2026-07-10", sys: 148, dia: 94 },
  { date: "2026-08-26", sys: 145, dia: 92 },
];

describe("CourbeTension", () => {
  it("dessine chaque relevé et se lit à voix haute", () => {
    const { container } = render(<CourbeTension releves={releves} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Tension : 150/95 le 28/05, 148/94 le 10/07, 145/92 le 26/08. Trop haute au-dessus de 140/90.");
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(screen.getByText("145/92")).toBeTruthy();
  });

  it("ne montre rien avec un seul relevé", () => {
    const { container } = render(<CourbeTension releves={releves.slice(0, 1)} />);
    expect(container.innerHTML).toBe("");
  });
});
