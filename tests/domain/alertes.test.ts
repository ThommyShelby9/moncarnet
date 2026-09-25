import { describe, expect, it } from "vitest";
import { minutesRestantes, statutAlerte } from "@/domain/alertes";

const echeance = new Date("2026-09-25T19:29:00Z");
const alerte = { echeance, priseEnChargeLe: null, annuleeLe: null };

describe("statutAlerte", () => {
  it("est en attente dans le délai, en retard après", () => {
    expect(statutAlerte(alerte, new Date("2026-09-25T19:20:00Z"))).toBe("en_attente");
    expect(statutAlerte(alerte, new Date("2026-09-25T19:30:00Z"))).toBe("en_retard");
  });

  it("la prise en charge et l'annulation l'emportent sur le délai", () => {
    const tard = new Date("2026-09-25T20:00:00Z");
    expect(statutAlerte({ ...alerte, priseEnChargeLe: new Date("2026-09-25T19:40:00Z") }, tard)).toBe("prise_en_charge");
    expect(statutAlerte({ ...alerte, annuleeLe: new Date("2026-09-25T19:16:00Z") }, tard)).toBe("annulee");
  });
});

describe("minutesRestantes", () => {
  it("compte les minutes avant l'échéance, puis le retard en négatif", () => {
    expect(minutesRestantes(echeance, new Date("2026-09-25T19:14:00Z"))).toBe(15);
    expect(minutesRestantes(echeance, new Date("2026-09-25T19:28:30Z"))).toBe(1);
    expect(minutesRestantes(echeance, new Date("2026-09-25T19:32:00Z"))).toBe(-3);
  });
});
