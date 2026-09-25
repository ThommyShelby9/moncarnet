// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CodeRetrait } from "@/ui/CodeRetrait";
import { Posologie } from "@/ui/Posologie";

afterEach(cleanup);

describe("Posologie", () => {
  it("dessine chaque moment de la journée, en disant le nombre de comprimés", () => {
    render(<Posologie ligne={{ matin: 1, midi: 0, soir: 2 }} />);
    expect(screen.getByRole("listitem", { name: "Le matin : 1 comprimé" })).toBeTruthy();
    expect(screen.getByRole("listitem", { name: "À midi : rien" })).toBeTruthy();
    expect(screen.getByRole("listitem", { name: "Le soir : 2 comprimés" })).toBeTruthy();
  });
});

describe("CodeRetrait", () => {
  it("affiche le code en grand avec son libellé", () => {
    render(<CodeRetrait code="M4R2TN" />);
    expect(screen.getByText("M4R2TN")).toBeTruthy();
    expect(screen.getByText("Code de retrait")).toBeTruthy();
  });
});
