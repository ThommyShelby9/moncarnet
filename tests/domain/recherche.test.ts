import { describe, expect, it } from "vitest";
import { analyserRecherche, correspondAuNom } from "@/domain/recherche";

describe("analyserRecherche", () => {
  it("reconnaît un numéro de téléphone", () => {
    expect(analyserRecherche("01 97 00 00 01").telephone).toBe("+2290197000001");
  });

  it("reconnaît un code de carnet", () => {
    expect(analyserRecherche("k7p4qx").code).toBe("K7P4QX");
  });

  it("découpe un nom en mots, sans accents ni majuscules", () => {
    expect(analyserRecherche("  Sèna  HOUNGBO ").mots).toEqual(["sena", "houngbo"]);
  });

  it("ne prend pas un prénom pour un numéro", () => {
    expect(analyserRecherche("Codjo").telephone).toBeNull();
  });
});

describe("correspondAuNom", () => {
  const sena = { prenom: "Sèna", nom: "Houngbo" };

  it("trouve sans accent, dans n'importe quel ordre, même avec un début de mot", () => {
    expect(correspondAuNom(sena, ["houngbo", "sena"])).toBe(true);
    expect(correspondAuNom(sena, ["sen"])).toBe(true);
  });

  it("ne trouve ni un autre nom, ni une recherche vide", () => {
    expect(correspondAuNom(sena, ["awa"])).toBe(false);
    expect(correspondAuNom(sena, [])).toBe(false);
  });
});
