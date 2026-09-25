import { describe, expect, it } from "vitest";
import { ageEnAnnees, ajouterJours, aujourdhuiAuBenin, depuisDateISO, joursEntre, libelleAge } from "@/domain/dates";

describe("dates", () => {
  it("ajoute des jours en passant les mois, les années et le 29 février", () => {
    expect(ajouterJours("2026-09-25", 7)).toBe("2026-10-02");
    expect(ajouterJours("2026-12-31", 1)).toBe("2027-01-01");
    expect(ajouterJours("2028-02-28", 1)).toBe("2028-02-29");
    expect(ajouterJours("2027-02-28", 1)).toBe("2027-03-01");
    expect(ajouterJours("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("compte les jours entre deux dates", () => {
    expect(joursEntre("2026-09-25", "2026-10-25")).toBe(30);
    expect(joursEntre("2026-10-25", "2026-09-25")).toBe(-30);
  });

  it("refuse une date qui n'existe pas", () => {
    expect(() => depuisDateISO("2026-02-30")).toThrow(/Date invalide/);
    expect(() => depuisDateISO("25/09/2026")).toThrow(/Date invalide/);
  });

  it("calcule l'âge à la veille et au jour de l'anniversaire", () => {
    expect(ageEnAnnees("1968-09-26", "2026-09-25")).toBe(57);
    expect(ageEnAnnees("1968-09-25", "2026-09-25")).toBe(58);
  });

  it("dit l'âge en mois avant 2 ans", () => {
    expect(libelleAge("2026-01-25", "2026-09-25")).toBe("8 mois");
    expect(libelleAge("2026-09-01", "2026-09-25")).toBe("moins d'un mois");
    expect(libelleAge("2024-09-25", "2026-09-25")).toBe("2 ans");
    expect(libelleAge("1968-03-12", "2026-09-25")).toBe("58 ans");
  });

  it("donne la date du jour à l'heure du Bénin (UTC+1)", () => {
    expect(aujourdhuiAuBenin(new Date("2026-09-25T23:30:00Z"))).toBe("2026-09-26");
    expect(aujourdhuiAuBenin(new Date("2026-09-25T22:59:00Z"))).toBe("2026-09-25");
  });
});
