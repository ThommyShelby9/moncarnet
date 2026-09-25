import { describe, expect, it } from "vitest";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";

describe("normaliserTelephone", () => {
  it.each([
    ["01 97 12 34 56", "+2290197123456"],
    ["0197123456", "+2290197123456"],
    ["+229 01 97 12 34 56", "+2290197123456"],
    ["00229 0197123456", "+2290197123456"],
    ["97 12 34 56", "+2290197123456"],
    ["+229 97 12 34 56", "+2290197123456"],
  ])("accepte %s", (saisie, attendu) => {
    expect(normaliserTelephone(saisie)).toBe(attendu);
  });

  it.each(["", "12345", "+33 6 12 34 56 78", "02 97 12 34 56", "01 97 12 34 5"])("refuse %s", (saisie) => {
    expect(normaliserTelephone(saisie)).toBeNull();
  });

  it("formate pour l'affichage", () => {
    expect(formaterTelephone("+2290197123456")).toBe("01 97 12 34 56");
  });
});
