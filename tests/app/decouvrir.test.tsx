// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PageDecouvrir from "@/app/decouvrir/page";

afterEach(cleanup);

describe("page de présentation", () => {
  it("raconte la solution de bout en bout, dans l'ordre", () => {
    render(<PageDecouvrir />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Le constat",
      "Awa, de la grossesse à la naissance",
      "Codjo, un patient au quotidien",
      "Ceux qui accompagnent",
      "Pour l'État : piloter sans aucun nom",
      "Pensé pour tout le monde",
      "Sous le capot",
      "Essayez les deux parcours",
    ]);
  });

  it("donne un texte à chaque capture, et une source à chaque chiffre", () => {
    render(<PageDecouvrir />);
    const images = screen.getAllByRole("img").filter((i) => i.tagName === "IMG");
    expect(images.length).toBeGreaterThanOrEqual(14);
    expect(images.every((i) => (i.getAttribute("alt") ?? "").length > 20)).toBe(true);
    expect(screen.getAllByText(/Source :/)).toHaveLength(4);
  });

  it("mène à la démo et à la connexion", () => {
    render(<PageDecouvrir />);
    expect(screen.getAllByRole("link", { name: /Essayer la démo/ }).every((a) => a.getAttribute("href") === "/demo")).toBe(true);
    expect(screen.getByRole("link", { name: "Ouvrir mon carnet" }).getAttribute("href")).toBe("/connexion");
  });
});
