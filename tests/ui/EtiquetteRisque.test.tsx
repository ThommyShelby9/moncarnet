// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EtiquetteRisque } from "@/ui/EtiquetteRisque";

afterEach(cleanup);

describe("EtiquetteRisque", () => {
  it.each([
    ["normal", "Normal"],
    ["surveillance", "À surveiller"],
    ["eleve", "Élevé"],
  ] as const)("affiche %s en toutes lettres", (niveau, texte) => {
    const { getByText } = render(<EtiquetteRisque niveau={niveau} />);
    expect(getByText(texte)).toBeTruthy();
  });

  it("réserve le rouge au risque élevé", () => {
    const { getByText } = render(<EtiquetteRisque niveau="eleve" />);
    expect(getByText("Élevé").className).toContain("bg-urgence");
  });
});
