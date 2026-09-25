import { describe, expect, it } from "vitest";
import { planifier } from "@/domain/calendrier";
import { ajouterJours } from "@/domain/dates";
import { PROGRAMMES } from "@/domain/programmes";
import { semainesDeGrossesse, termePrevu } from "@/domain/programmes/grossesse";

const DDR = "2026-03-06";

describe("grossesse", () => {
  it("planifie les 4 consultations et l'accouchement pour une inscription précoce", () => {
    const etapes = planifier(PROGRAMMES.grossesse, DDR, ajouterJours(DDR, 8 * 7));
    expect(etapes.map((e) => e.code)).toEqual(["cpn1", "cpn2", "cpn3", "cpn4", "accouchement"]);
    expect(etapes[0]?.datePrevue).toBe(ajouterJours(DDR, 12 * 7));
    expect(etapes[1]?.datePrevue).toBe(ajouterJours(DDR, 26 * 7));
    expect(etapes.at(-1)?.datePrevue).toBe(termePrevu(DDR));
    expect(etapes.at(-1)?.rendezVous).toBe(false);
  });

  it("ne génère pas une consultation dont la fenêtre est passée", () => {
    const etapes = planifier(PROGRAMMES.grossesse, DDR, ajouterJours(DDR, 20 * 7));
    expect(etapes.map((e) => e.code)).toEqual(["cpn2", "cpn3", "cpn4", "accouchement"]);
  });

  it("planifie à l'inscription + 7 jours une consultation dont la date cible est passée mais la fenêtre ouverte", () => {
    const inscription = ajouterJours(DDR, 27 * 7);
    const cpn2 = planifier(PROGRAMMES.grossesse, DDR, inscription).find((e) => e.code === "cpn2");
    expect(cpn2?.datePrevue).toBe(ajouterJours(inscription, 7));
  });

  it("calcule le terme et l'âge de la grossesse", () => {
    expect(termePrevu(DDR)).toBe(ajouterJours(DDR, 280));
    expect(semainesDeGrossesse(DDR, ajouterJours(DDR, 32 * 7 + 3))).toBe(32);
  });
});

describe("vaccination de l'enfant", () => {
  it("planifie les 6 séances depuis la naissance", () => {
    const naissance = "2026-01-25";
    const etapes = planifier(PROGRAMMES.vaccination, naissance, naissance);
    expect(etapes.map((e) => e.code)).toEqual(["naissance", "6sem", "10sem", "14sem", "9mois", "15mois"]);
    expect(etapes.find((e) => e.code === "9mois")?.datePrevue).toBe(ajouterJours(naissance, 270));
    expect(etapes.every((e) => e.motif === "vaccin" && e.toleranceManqueJours === 14)).toBe(true);
  });
});

describe("contrôles périodiques", () => {
  it("planifie un contrôle de la tension tous les 90 jours sur un an", () => {
    const ref = "2026-09-25";
    const etapes = planifier(PROGRAMMES.hypertension, ref, ref);
    expect(etapes.map((e) => e.datePrevue)).toEqual([90, 180, 270, 360].map((j) => ajouterJours(ref, j)));
    expect(etapes.every((e) => e.motif === "tension")).toBe(true);
  });

  it("reprend au prochain contrôle pour un diagnostic ancien", () => {
    const ref = "2026-01-01";
    const etapes = planifier(PROGRAMMES.hypertension, ref, ajouterJours(ref, 100));
    expect(etapes[0]?.code).toBe("controle-2");
    expect(etapes[0]?.datePrevue).toBe(ajouterJours(ref, 180));
  });

  it("utilise le même rythme pour le diabète", () => {
    const etapes = planifier(PROGRAMMES.diabete, "2026-09-25", "2026-09-25");
    expect(etapes).toHaveLength(4);
    expect(etapes[0]?.motif).toBe("diabete");
  });
});

describe("consultation générale", () => {
  it("n'a pas d'étape planifiée", () => {
    expect(planifier(PROGRAMMES.consultation, "2026-09-25", "2026-09-25")).toEqual([]);
  });
});
