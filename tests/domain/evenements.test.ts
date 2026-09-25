import { describe, expect, it } from "vitest";
import { evenementSchema } from "@/domain/evenements";

describe("evenementSchema", () => {
  it("accepte une consultation avec une tension", () => {
    const r = evenementSchema.safeParse({
      type: "consultation",
      donnees: { motif: "tension", etape: "controle-1", mesures: { tensionSys: 150, tensionDia: 95 } },
    });
    expect(r.success).toBe(true);
  });

  it("refuse une tension impossible", () => {
    const r = evenementSchema.safeParse({ type: "mesure", donnees: { mesures: { tensionSys: 900, tensionDia: 95 } } });
    expect(r.success).toBe(false);
  });

  it("refuse une vaccination sans vaccin", () => {
    expect(evenementSchema.safeParse({ type: "vaccination", donnees: { etape: "6sem", vaccins: [] } }).success).toBe(false);
  });

  it("accepte une prise de médicament", () => {
    const r = evenementSchema.safeParse({
      type: "prise_medicament",
      donnees: { traitement: "Amlodipine 5 mg", moment: "soir", statut: "fait" },
    });
    expect(r.success).toBe(true);
  });

  it("refuse un type inconnu", () => {
    expect(evenementSchema.safeParse({ type: "inconnu", donnees: {} }).success).toBe(false);
  });
});
