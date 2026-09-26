import { describe, expect, it } from "vitest";
import { fileDAttente, placeDe, type Passage } from "@/domain/salle-attente";

const arrive = new Date("2026-09-26T08:00:00Z");
const passage = (id: string, numero: number, extra: Partial<Passage> = {}): Passage => ({ id, patientId: `p-${id}`, numero, urgent: false, arriveLe: arrive, appeleLe: null, ...extra });

describe("fileDAttente", () => {
  it("fait passer une urgence devant, puis l'ordre des numéros ; les personnes appelées sortent de la file", () => {
    const file = fileDAttente([passage("a", 3), passage("b", 1, { appeleLe: arrive }), passage("c", 5, { urgent: true }), passage("d", 2)]);
    expect(file.map((p) => p.numero)).toEqual([5, 2, 3]);
  });
});

describe("placeDe", () => {
  const passages = [passage("a", 1, { appeleLe: arrive }), passage("b", 2), passage("c", 3), passage("d", 4), passage("e", 5)];
  it("dit combien de personnes restent avant, et quand c'est bientôt", () => {
    expect(placeDe(passages, "p-e")).toEqual({ etat: "attente", numero: 5, avant: 3, bientot: false });
    expect(placeDe(passages, "p-d")).toEqual({ etat: "attente", numero: 4, avant: 2, bientot: true });
  });
  it("dit quand c'est son tour, et rien à qui n'est pas arrivé", () => {
    expect(placeDe(passages, "p-a")).toEqual({ etat: "appele", numero: 1 });
    expect(placeDe(passages, "p-z")).toBeNull();
  });
});
