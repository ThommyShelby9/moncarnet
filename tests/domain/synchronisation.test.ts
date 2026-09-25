import { describe, expect, it } from "vitest";
import { dateAcceptable, evenementEntrantSchema } from "@/domain/synchronisation";

describe("evenementEntrantSchema", () => {
  it("lit une saisie venue du téléphone", () => {
    const saisie = {
      id: "0190b3a1-7c2e-7a41-9b3c-2f4d5e6a7b8c",
      patientId: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f",
      type: "visite_domicile",
      survenuLe: "2026-09-25T09:12:00.000Z",
      donnees: { constat: "tout_va_bien" },
    };
    expect(evenementEntrantSchema.safeParse(saisie).success).toBe(true);
    expect(evenementEntrantSchema.safeParse({ ...saisie, survenuLe: "hier" }).success).toBe(false);
  });
});

describe("dateAcceptable", () => {
  const maintenant = new Date("2026-09-25T12:00:00Z");
  it("accepte une saisie des 30 derniers jours", () => {
    expect(dateAcceptable(new Date("2026-09-25T08:00:00Z"), maintenant)).toBe(true);
    expect(dateAcceptable(new Date("2026-08-27T08:00:00Z"), maintenant)).toBe(true);
  });
  it("refuse une date dans le futur ou trop ancienne (horloge du téléphone fausse)", () => {
    expect(dateAcceptable(new Date("2026-09-25T12:30:00Z"), maintenant)).toBe(false);
    expect(dateAcceptable(new Date("2026-07-01T08:00:00Z"), maintenant)).toBe(false);
  });
});
