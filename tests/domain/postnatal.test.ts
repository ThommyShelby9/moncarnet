import { describe, expect, it } from "vitest";
import { planifier } from "@/domain/calendrier";
import { PROGRAMMES } from "@/domain/programmes";
import { evaluerRisque } from "@/domain/risque";

describe("suivi après l'accouchement", () => {
  it("prévoit les visites du 3ᵉ jour, de la 2ᵉ semaine et des 6 semaines", () => {
    const etapes = planifier(PROGRAMMES.postnatal, "2026-09-26", "2026-09-26");
    expect(etapes.map((e) => [e.code, e.datePrevue, e.motif])).toEqual([
      ["cpon1", "2026-09-29", "grossesse"],
      ["cpon2", "2026-10-06", "grossesse"],
      ["cpon3", "2026-11-07", "grossesse"],
    ]);
  });

  it("voit un risque élevé quand la tension monte après l'accouchement", () => {
    const contexte = { aujourdhui: "2026-10-01", dateNaissance: "2002-04-18", antecedents: {}, etapesManquees: 0, signalementsOuverts: 0 };
    expect(evaluerRisque("postnatal", { ...contexte, mesures: [{ date: "2026-09-30", tensionSys: 150, tensionDia: 95 }] })).toEqual({
      niveau: "eleve",
      motifs: ["Tension élevée après l'accouchement (150/95)"],
    });
    expect(evaluerRisque("postnatal", { ...contexte, mesures: [], signalementsOuverts: 1 }).niveau).toBe("eleve");
    expect(evaluerRisque("postnatal", { ...contexte, mesures: [] })).toEqual({ niveau: "normal", motifs: [] });
  });
});
