import { describe, expect, it } from "vitest";
import type { EtapePlanifiee } from "@/domain/calendrier";
import { compterManquees, statutEtape } from "@/domain/statuts";

const etape = { datePrevue: "2026-09-10", toleranceManqueJours: 7 };

describe("statutEtape", () => {
  it("est faite quand un événement l'a honorée, même en retard", () => {
    expect(statutEtape(etape, true, "2026-12-01")).toBe("faite");
  });

  it("reste à venir jusqu'à la fin de la tolérance", () => {
    expect(statutEtape(etape, false, "2026-09-17")).toBe("a_venir");
  });

  it("devient manquée le lendemain de la tolérance", () => {
    expect(statutEtape(etape, false, "2026-09-18")).toBe("manquee");
  });
});

describe("compterManquees", () => {
  it("ignore les étapes qui ne sont pas des rendez-vous", () => {
    const etapes = [
      { code: "cpn1", datePrevue: "2026-05-01", toleranceManqueJours: 7, rendezVous: true },
      { code: "cpn2", datePrevue: "2026-07-01", toleranceManqueJours: 7, rendezVous: true },
      { code: "accouchement", datePrevue: "2026-08-01", toleranceManqueJours: 14, rendezVous: false },
    ] as EtapePlanifiee[];
    expect(compterManquees(etapes, new Set(["cpn1"]), "2026-09-25")).toBe(1);
  });
});
