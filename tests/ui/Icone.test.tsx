// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Icone } from "@/ui/Icone";
import { NOMS_ICONES } from "@/ui/icones";

afterEach(cleanup);

describe("Icone", () => {
  it("pointe vers le symbole du sprite", () => {
    const { container } = render(<Icone nom="hi-blood-pressure" />);
    const use = container.querySelector("use");
    expect(use?.getAttribute("href")).toBe("/icons/sprite.svg#hi-blood-pressure");
  });

  it("est décorative quand elle n'a pas de titre", () => {
    const { container } = render(<Icone nom="ph-sun" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("porte un nom accessible quand elle a un titre", () => {
    const { getByRole } = render(<Icone nom="ph-moon" titre="Le soir" />);
    expect(getByRole("img", { name: "Le soir" })).toBeTruthy();
  });

  it("connaît les pictogrammes indispensables", () => {
    for (const nom of ["hi-pregnant", "hi-syringe-vaccine", "ph-play", "ph-sun-horizon", "ph-backspace"]) {
      expect(NOMS_ICONES).toContain(nom);
    }
  });

  it("connaît les pictogrammes des signes de danger et du rendez-vous", () => {
    for (const nom of ["hi-blood-drop", "hi-headache", "hi-foot", "hi-fetus", "hi-lungs", "hi-vomiting", "hi-diarrhea", "ph-drop", "ph-question", "ph-hourglass-medium", "ph-map-pin", "ph-arrow-counter-clockwise", "ph-check"]) {
      expect(NOMS_ICONES).toContain(nom);
    }
  });
});
