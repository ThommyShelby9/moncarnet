import { describe, expect, it } from "vitest";
import { ajouterJours } from "@/domain/dates";
import { joursProposes, libellePlaces, motifDePlage, motifsProposes, type CreneauVu } from "@/domain/rendez-vous";

describe("motifsProposes", () => {
  it("met en premier le motif du programme suivi", () => {
    expect(motifsProposes({ age: 58, sexe: "M", programmes: ["hypertension"] })).toEqual(["tension", "consultation", "fievre", "dents"]);
  });

  it("propose d'abord le vaccin pour un bébé", () => {
    expect(motifsProposes({ age: 0, sexe: "M", programmes: ["vaccination"] })).toEqual(["vaccin", "fievre", "consultation", "dents"]);
  });

  it("propose la grossesse aux femmes en âge d'avoir un enfant seulement", () => {
    expect(motifsProposes({ age: 24, sexe: "F", programmes: ["grossesse"] })).toEqual(["grossesse", "consultation", "fievre", "tension", "dents"]);
    expect(motifsProposes({ age: 54, sexe: "F", programmes: ["consultation"] })).toEqual(["consultation", "fievre", "tension", "dents"]);
  });
});

describe("motifDePlage", () => {
  it("reçoit la fièvre et les dents pendant les consultations", () => {
    expect(motifDePlage("fievre")).toBe("consultation");
    expect(motifDePlage("dents")).toBe("consultation");
    expect(motifDePlage("vaccin")).toBe("vaccin");
  });
});

describe("joursProposes", () => {
  const creneau = (id: string, date: string, moment: "matin" | "apres_midi", capacite: number, reserves: number): CreneauVu => ({
    id,
    date,
    moment,
    capacite,
    reserves,
  });

  it("propose à partir de demain, le matin avant l'après-midi", () => {
    const jours = joursProposes(
      [creneau("b", "2026-09-28", "apres_midi", 8, 0), creneau("a", "2026-09-28", "matin", 10, 10), creneau("x", "2026-09-25", "matin", 10, 0)],
      "2026-09-25",
    );
    expect(jours.map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("compte les places et repère les jours complets", () => {
    const [plein, libre] = joursProposes([creneau("a", "2026-09-28", "matin", 10, 10), creneau("b", "2026-09-30", "matin", 12, 9)], "2026-09-25");
    expect(plein).toMatchObject({ complet: true, places: 0 });
    expect(libre).toMatchObject({ complet: false, places: 3, dansJours: 5, soleils: 5, libelle: "Mercredi", quand: "dans 5 jours" });
  });

  it("ne propose pas plus de 8 créneaux", () => {
    const beaucoup = Array.from({ length: 12 }, (_, i) => creneau(`c${i}`, ajouterJours("2026-09-25", i + 1), "matin", 5, 0));
    expect(joursProposes(beaucoup, "2026-09-25")).toHaveLength(8);
  });

  it("dit le nombre de places", () => {
    expect(libellePlaces(0)).toBe("Complet");
    expect(libellePlaces(1)).toBe("1 place");
    expect(libellePlaces(3)).toBe("3 places");
  });
});
