import { describe, expect, it } from "vitest";
import { lireSaisieConsultation } from "@/domain/consultation";

const vide = { motif: "tension", etape: "", tensionSys: "", tensionDia: "", glycemieGL: "", hemoglobineGDL: "", poidsKg: "", notes: "" };

describe("lireSaisieConsultation", () => {
  it("lit une tension et ignore les champs vides", () => {
    expect(lireSaisieConsultation({ ...vide, tensionSys: "180", tensionDia: "110" })).toEqual({
      ok: true,
      saisie: { motif: "tension", mesures: { tensionSys: 180, tensionDia: 110 } },
    });
  });

  it("comprend la virgule décimale", () => {
    expect(lireSaisieConsultation({ ...vide, motif: "diabete", glycemieGL: "1,4" })).toMatchObject({ ok: true, saisie: { mesures: { glycemieGL: 1.4 } } });
  });

  it("demande les deux chiffres de la tension", () => {
    expect(lireSaisieConsultation({ ...vide, tensionSys: "150" })).toEqual({
      ok: false,
      message: "Indiquez les deux chiffres de la tension, par exemple 140 sur 90.",
    });
  });

  it("dit quel champ vérifier", () => {
    expect(lireSaisieConsultation({ ...vide, tensionSys: "900", tensionDia: "90" })).toEqual({ ok: false, message: "Vérifiez : la tension (chiffre du haut)." });
    expect(lireSaisieConsultation({ ...vide, motif: "xx" })).toEqual({ ok: false, message: "Vérifiez : le motif." });
  });

  it("garde l'étape et les notes", () => {
    expect(lireSaisieConsultation({ ...vide, motif: "grossesse", etape: "cpn3", notes: "Le bébé bouge bien" })).toMatchObject({
      ok: true,
      saisie: { etape: "cpn3", notes: "Le bébé bouge bien", mesures: {} },
    });
  });
});
