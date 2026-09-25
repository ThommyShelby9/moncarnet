import { describe, expect, it } from "vitest";
import { statutsDesPrises, traitementsEnCours, type OrdonnanceVue } from "@/domain/traitements";

const ordonnance = (delivreeLe: string | null, dureeJours = 30): OrdonnanceVue => ({
  id: "ord-1",
  patientId: "p1",
  delivreeLe,
  lignes: [{ medicament: "Amlodipine 5 mg", matin: 0, midi: 0, soir: 1, dureeJours, indication: "la tension", conseil: "avec un verre d'eau" }],
});

describe("traitementsEnCours", () => {
  it("fait d'une ordonnance délivrée un traitement, avec ses moments de prise", () => {
    const [traitement] = traitementsEnCours([ordonnance("2026-09-15")], "2026-09-25");
    expect(traitement).toMatchObject({ cle: "ord-1:0", patientId: "p1", medicament: "Amlodipine 5 mg", indication: "la tension", dernierJour: "2026-10-14" });
    expect(traitement?.prises).toEqual([{ moment: "soir", quantite: 1 }]);
  });

  it("ignore une ordonnance pas encore délivrée", () => {
    expect(traitementsEnCours([ordonnance(null)], "2026-09-25")).toEqual([]);
  });

  it("garde le traitement jusqu'au dernier jour inclus, pas le lendemain", () => {
    expect(traitementsEnCours([ordonnance("2026-09-16", 10)], "2026-09-25")).toHaveLength(1);
    expect(traitementsEnCours([ordonnance("2026-09-15", 10)], "2026-09-25")).toEqual([]);
  });

  it("donne une clé par ligne d'ordonnance", () => {
    const o = ordonnance("2026-09-20");
    o.lignes.push({ medicament: "Paracétamol 500 mg", matin: 1, midi: 1, soir: 1, dureeJours: 3 });
    expect(traitementsEnCours([o], "2026-09-21").map((t) => t.cle)).toEqual(["ord-1:0", "ord-1:1"]);
  });
});

describe("statutsDesPrises", () => {
  const le = (heure: string) => new Date(`2026-09-25T${heure}:00Z`);

  it("retient le dernier mot, dans l'ordre des heures", () => {
    const statuts = statutsDesPrises([
      { traitementCle: "a:0", moment: "soir", statut: "fait", survenuLe: le("19:10") },
      { traitementCle: "a:0", moment: "soir", statut: "plus_tard", survenuLe: le("18:00") },
    ]);
    expect(statuts.get("a:0|soir")).toBe("fait");
  });

  it("« Annuler » remet la prise à faire", () => {
    const statuts = statutsDesPrises([
      { traitementCle: "a:0", moment: "soir", statut: "fait", survenuLe: le("19:10") },
      { traitementCle: "a:0", moment: "soir", statut: "annule", survenuLe: le("19:11") },
    ]);
    expect(statuts.has("a:0|soir")).toBe(false);
  });
});
