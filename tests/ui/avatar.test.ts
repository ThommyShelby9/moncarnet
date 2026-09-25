import { describe, expect, it } from "vitest";
import { iconePourPersonne, libelleLien } from "@/ui/avatar";

describe("iconePourPersonne", () => {
  it.each([
    ["M", 0, "hi-baby-0306m"],
    ["F", 7, "hi-boy-0105y"],
    ["F", 30, "hi-woman"],
    ["M", 58, "hi-man"],
    ["F", 71, "hi-old-woman"],
    ["M", 70, "hi-elderly"],
  ] as const)("%s de %i ans : %s", (sexe, age, icone) => {
    expect(iconePourPersonne(sexe, age)).toBe(icone);
  });
});

describe("libelleLien", () => {
  it("dit la relation du point de vue du titulaire du compte", () => {
    expect(libelleLien("soi", "M")).toBe("Moi");
    expect(libelleLien("conjoint", "F")).toBe("Ma femme");
    expect(libelleLien("conjoint", "M")).toBe("Mon mari");
    expect(libelleLien("parent", "F")).toBe("Ma fille");
    expect(libelleLien("enfant", "F")).toBe("Ma mère");
    expect(libelleLien("aidant", "M")).toBe("Je m'en occupe");
  });
});
