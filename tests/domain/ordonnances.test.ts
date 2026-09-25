import { describe, expect, it } from "vitest";
import { genererCodeRetrait, lireLignes, normaliserCode, quantiteTotale, texteDePosologie } from "@/domain/ordonnances";

describe("code de retrait", () => {
  it("a 6 caractères, sans I, O, 0 ni 1", () => {
    for (let i = 0; i < 50; i++) expect(genererCodeRetrait()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(genererCodeRetrait(() => 0)).toBe("AAAAAA");
    expect(genererCodeRetrait(() => 0.999)).toBe("999999");
  });

  it("accepte une saisie en minuscules, avec un espace ou un tiret", () => {
    expect(normaliserCode(" k7p 4qx ")).toBe("K7P4QX");
    expect(normaliserCode("K7P-4QX")).toBe("K7P4QX");
  });

  it("refuse un code impossible", () => {
    expect(normaliserCode("K7P4Q0")).toBeNull();
    expect(normaliserCode("K7P4Q")).toBeNull();
  });
});

describe("lireLignes", () => {
  const champs = {
    "lignes.0.medicament": "Amlodipine 5 mg",
    "lignes.0.matin": "0",
    "lignes.0.midi": "0",
    "lignes.0.soir": "1",
    "lignes.0.dureeJours": "30",
    "lignes.0.indication": "la tension",
    "lignes.0.conseil": "",
    "lignes.1.medicament": "",
  };

  it("lit les lignes remplies et ignore les lignes vides", () => {
    expect(lireLignes(champs)).toEqual({
      ok: true,
      lignes: [{ medicament: "Amlodipine 5 mg", matin: 0, midi: 0, soir: 1, dureeJours: 30, indication: "la tension", conseil: undefined }],
    });
  });

  it("demande au moins une prise", () => {
    expect(lireLignes({ ...champs, "lignes.0.soir": "0" })).toEqual({ ok: false, message: "Ligne 1 : indiquez au moins une prise (matin, midi ou soir)." });
  });

  it("refuse une durée absente et une ordonnance vide", () => {
    expect(lireLignes({ ...champs, "lignes.0.dureeJours": "" })).toMatchObject({ ok: false });
    expect(lireLignes({ "lignes.0.medicament": "" })).toEqual({ ok: false, message: "Ajoutez au moins un médicament." });
  });
});

describe("posologie", () => {
  const ligne = { medicament: "Paracétamol 500 mg", matin: 1, midi: 1, soir: 1, dureeJours: 5, indication: "la fièvre", conseil: "après le repas" };

  it("compte les comprimés à donner", () => {
    expect(quantiteTotale(ligne)).toBe(15);
  });

  it("se dit simplement, pour l'écoute", () => {
    expect(texteDePosologie(ligne)).toBe(
      "Paracétamol 500 mg, pour la fièvre. Le matin : 1 comprimé. À midi : 1 comprimé. Le soir : 1 comprimé. Pendant 5 jours, après le repas.",
    );
  });
});
