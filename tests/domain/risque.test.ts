import { describe, expect, it } from "vitest";
import { evaluerRisque, risqueGlobal, type ContexteRisque } from "@/domain/risque";

const base: ContexteRisque = {
  aujourdhui: "2026-09-25",
  dateNaissance: "1995-05-10",
  antecedents: {},
  mesures: [],
  etapesManquees: 0,
  signalementsOuverts: 0,
};

describe("grossesse", () => {
  it("est normale sans facteur de risque", () => {
    expect(evaluerRisque("grossesse", base)).toEqual({ niveau: "normal", motifs: [] });
  });

  it("passe en élevé avec une tension à 150/95", () => {
    const r = evaluerRisque("grossesse", { ...base, mesures: [{ date: "2026-09-20", tensionSys: 150, tensionDia: 95 }] });
    expect(r.niveau).toBe("eleve");
    expect(r.motifs).toContain("Tension élevée (150/95)");
  });

  it("passe en élevé avec un signe de danger non pris en charge", () => {
    expect(evaluerRisque("grossesse", { ...base, signalementsOuverts: 1 }).niveau).toBe("eleve");
  });

  it("cumule les motifs de surveillance", () => {
    const r = evaluerRisque("grossesse", {
      ...base,
      dateNaissance: "1988-01-01",
      antecedents: { cesarienne: true },
      mesures: [{ date: "2026-09-01", hemoglobineGDL: 9.8 }],
      etapesManquees: 2,
    });
    expect(r.niveau).toBe("surveillance");
    expect(r.motifs).toEqual([
      "Grossesse après 35 ans (38 ans)",
      "Césarienne antérieure",
      "Anémie (9.8 g/dL)",
      "2 rendez-vous manqués",
    ]);
  });

  it("signale une grossesse avant 18 ans", () => {
    expect(evaluerRisque("grossesse", { ...base, dateNaissance: "2009-06-01" }).motifs).toContain("Grossesse avant 18 ans (17 ans)");
  });
});

describe("hypertension", () => {
  it("passe en élevé au-delà de 180/110", () => {
    const r = evaluerRisque("hypertension", { ...base, mesures: [{ date: "2026-09-24", tensionSys: 182, tensionDia: 112 }] });
    expect(r).toEqual({ niveau: "eleve", motifs: ["Tension très élevée (182/112)"] });
  });

  it("surveille une tension non contrôlée sur les deux derniers relevés", () => {
    const r = evaluerRisque("hypertension", {
      ...base,
      mesures: [
        { date: "2026-06-01", tensionSys: 150, tensionDia: 95 },
        { date: "2026-09-01", tensionSys: 145, tensionDia: 92 },
      ],
    });
    expect(r).toEqual({ niveau: "surveillance", motifs: ["Tension non contrôlée (150/95 puis 145/92)"] });
  });

  it("se fie au relevé le plus récent par date, même saisi en premier", () => {
    const r = evaluerRisque("hypertension", {
      ...base,
      mesures: [
        { date: "2026-09-20", tensionSys: 125, tensionDia: 80 },
        { date: "2026-03-01", tensionSys: 185, tensionDia: 115 },
        { date: "2026-06-01", tensionSys: 150, tensionDia: 95 },
      ],
    });
    expect(r.niveau).toBe("normal");
  });
});

describe("diabète", () => {
  it("passe en élevé au-delà de 2,5 g/L", () => {
    expect(evaluerRisque("diabete", { ...base, mesures: [{ date: "2026-09-01", glycemieGL: 2.7 }] }).niveau).toBe("eleve");
  });

  it("surveille deux glycémies à jeun au-dessus de 1,26 g/L", () => {
    const r = evaluerRisque("diabete", {
      ...base,
      mesures: [
        { date: "2026-08-01", glycemieGL: 1.4 },
        { date: "2026-09-01", glycemieGL: 1.35 },
      ],
    });
    expect(r.niveau).toBe("surveillance");
  });
});

describe("vaccination et consultation", () => {
  it("surveille un vaccin en retard", () => {
    expect(evaluerRisque("vaccination", { ...base, etapesManquees: 1 })).toEqual({ niveau: "surveillance", motifs: ["1 vaccin en retard"] });
  });

  it("reste normal pour une consultation générale", () => {
    expect(evaluerRisque("consultation", { ...base, etapesManquees: 5 }).niveau).toBe("normal");
  });
});

describe("risqueGlobal", () => {
  it("retient le niveau le plus haut et tous les motifs", () => {
    const r = risqueGlobal([
      { niveau: "surveillance", motifs: ["A"] },
      { niveau: "eleve", motifs: ["B"] },
      { niveau: "normal", motifs: [] },
    ]);
    expect(r).toEqual({ niveau: "eleve", motifs: ["A", "B"] });
  });
});
