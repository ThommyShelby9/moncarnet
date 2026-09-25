// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MenuLateral } from "@/ui/MenuLateral";

vi.mock("next/navigation", () => ({ usePathname: () => "/soignant/patients/abc" }));
afterEach(cleanup);

describe("MenuLateral", () => {
  it("marque la rubrique ouverte, sans marquer l'accueil de l'espace", () => {
    render(
      <MenuLateral
        liens={[
          { href: "/soignant", libelle: "Aujourd'hui", icone: "ph-house" },
          { href: "/soignant/patients", libelle: "Patients", icone: "ph-users-three" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Patients" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Aujourd'hui" }).getAttribute("aria-current")).toBeNull();
  });
});
