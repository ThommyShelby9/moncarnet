// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/soignant/actions", () => ({ declarerNaissanceAction: vi.fn(async () => ({})) }));

import { FormulaireNaissance } from "@/app/soignant/patients/[id]/naissance/FormulaireNaissance";

afterEach(cleanup);

describe("FormulaireNaissance", () => {
  it("propose l'heure du moment, les lieux, et les vaccins de naissance cochés", () => {
    render(<FormulaireNaissance mereId="p-awa" date="2026-09-26" heure="06:40" />);
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("2026-09-26");
    expect((screen.getByLabelText("Heure") as HTMLInputElement).value).toBe("06:40");
    expect(screen.getAllByRole("radio", { name: /centre de santé|maison|En route|hôpital/ })).toHaveLength(4);
    expect((screen.getByRole("checkbox", { name: /BCG/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Enregistrer la naissance" })).toBeTruthy();
  });
});
