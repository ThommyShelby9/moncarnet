import { describe, expect, it } from "vitest";
import {
  cartesDuJour,
  detailCarte,
  surtitre,
  texteAEcouter,
  titreCarte,
  type EntreeCartes,
  type RendezVousVu,
} from "@/domain/cartes-du-jour";
import type { PriseNotee, TraitementEnCours } from "@/domain/traitements";

const traitement: TraitementEnCours = {
  cle: "ord:0",
  patientId: "codjo",
  medicament: "Amlodipine 5 mg",
  indication: "la tension",
  conseil: "avec un verre d'eau",
  prises: [{ moment: "soir", quantite: 1 }],
  dernierJour: "2026-10-14",
};

const rdv = (champs: Partial<RendezVousVu> & { id: string; datePrevue: string }): RendezVousVu => ({
  patientId: "codjo",
  motif: "tension",
  libelle: "Contrôle de la tension",
  moment: "matin",
  reserve: true,
  programme: true,
  faite: false,
  ...champs,
});

const prise = (statut: PriseNotee["statut"], heure: string): PriseNotee => ({
  traitementCle: "ord:0",
  moment: "soir",
  statut,
  survenuLe: new Date(`2026-09-25T${heure}:00Z`),
});

const base: EntreeCartes = { aujourdhui: "2026-09-25", heure: 20, traitements: [traitement], prisesDuJour: [], rendezVous: [] };

describe("cartesDuJour", () => {
  it("le soir, met le comprimé du soir en premier", () => {
    const { pile } = cartesDuJour({ ...base, rendezVous: [rdv({ id: "r1", datePrevue: "2026-10-01" })] });
    expect(pile.map((c) => c.type)).toEqual(["prise", "rendez_vous"]);
    expect(pile[0]).toMatchObject({ moment: "soir", quantite: 1, reportee: false });
  });

  it("retire la prise faite, et la remet après « Annuler »", () => {
    expect(cartesDuJour({ ...base, prisesDuJour: [prise("fait", "19:00")] }).pile).toEqual([]);
    expect(cartesDuJour({ ...base, prisesDuJour: [prise("fait", "19:00"), prise("annule", "19:01")] }).pile).toHaveLength(1);
  });

  it("passe une prise reportée en dernier", () => {
    const { pile } = cartesDuJour({ ...base, prisesDuJour: [prise("plus_tard", "19:00")], rendezVous: [rdv({ id: "r1", datePrevue: "2026-10-01" })] });
    expect(pile.map((c) => c.type)).toEqual(["rendez_vous", "prise"]);
    expect(pile[1]).toMatchObject({ reportee: true });
  });

  it("le matin, un rendez-vous du jour passe avant le comprimé du soir", () => {
    const { pile } = cartesDuJour({ ...base, heure: 9, rendezVous: [rdv({ id: "r1", datePrevue: "2026-09-25" })] });
    expect(pile.map((c) => c.type)).toEqual(["rendez_vous", "prise"]);
  });

  it("le matin, le comprimé du soir passe avant un rendez-vous dans 6 jours", () => {
    const { pile } = cartesDuJour({ ...base, heure: 9, rendezVous: [rdv({ id: "r1", datePrevue: "2026-10-01" })] });
    expect(pile.map((c) => c.type)).toEqual(["prise", "rendez_vous"]);
  });

  it("garde pour « ensuite » le premier rendez-vous au-delà de 7 jours", () => {
    const { pile, ensuite } = cartesDuJour({
      ...base,
      traitements: [],
      rendezVous: [
        rdv({ id: "loin", datePrevue: "2026-10-21" }),
        rdv({ id: "tres-loin", datePrevue: "2026-12-20" }),
        rdv({ id: "proche", datePrevue: "2026-09-27", reserve: false }),
      ],
    });
    expect(pile.map((c) => c.cle)).toEqual(["rdv:proche"]);
    expect(ensuite).toMatchObject({ type: "rendez_vous", rendezVousId: "loin", dansJours: 26 });
  });

  it("signale une étape de programme manquée, sauf si un autre jour est réservé", () => {
    const manquee = rdv({ id: "m", motif: "vaccin", libelle: "Vaccins des 6 semaines", datePrevue: "2026-09-01", reserve: false });
    expect(cartesDuJour({ ...base, traitements: [], rendezVous: [manquee] }).pile).toEqual([
      expect.objectContaining({ type: "manque", rendezVousId: "m" }),
    ]);
    const rattrapage = rdv({ id: "r", motif: "vaccin", datePrevue: "2026-09-30", reserve: true, programme: false });
    expect(cartesDuJour({ ...base, traitements: [], rendezVous: [manquee, rattrapage] }).pile.map((c) => c.type)).toEqual(["rendez_vous"]);
  });

  it("ne montre ni une étape faite, ni un retard encore dans la tolérance", () => {
    const faite = rdv({ id: "f", datePrevue: "2026-09-10", faite: true });
    const recente = rdv({ id: "t", datePrevue: "2026-09-20", reserve: false });
    expect(cartesDuJour({ ...base, traitements: [], rendezVous: [faite, recente] }).pile).toEqual([]);
  });

  it("ne garde que 5 cartes", () => {
    const beaucoup = Array.from({ length: 8 }, (_, i) => rdv({ id: `r${i}`, datePrevue: `2026-09-2${6 + (i % 3)}` }));
    expect(cartesDuJour({ ...base, traitements: [], rendezVous: beaucoup }).pile).toHaveLength(5);
  });
});

describe("textes des cartes", () => {
  it("dit la prise simplement", () => {
    const carte = cartesDuJour(base).pile[0]!;
    expect(surtitre(carte, "2026-09-25")).toBe("Ce soir");
    expect(titreCarte(carte)).toBe("1 comprimé pour la tension");
    expect(detailCarte(carte, "2026-09-25")).toBe("Amlodipine 5 mg, avec un verre d'eau");
  });

  it("dit le jour et le moment d'un rendez-vous réservé", () => {
    const carte = cartesDuJour({ ...base, traitements: [], rendezVous: [rdv({ id: "r", datePrevue: "2026-10-01" })] }).pile[0]!;
    expect(surtitre(carte, "2026-09-25")).toBe("Jeudi");
    expect(detailCarte(carte, "2026-09-25")).toBe("Dans 6 jours, le matin");
  });

  it("prépare le texte à écouter, avec le prénom quand c'est pour un proche", () => {
    const vaccin = rdv({ id: "s", patientId: "sena", motif: "vaccin", libelle: "Vaccins des 9 mois", datePrevue: "2026-09-27", reserve: false });
    const carte = cartesDuJour({ ...base, traitements: [], rendezVous: [vaccin] }).pile[0]!;
    expect(texteAEcouter(carte, { aujourdhui: "2026-09-25", pour: "Sèna" })).toBe(
      "Pour Sèna. À prévoir dans 2 jours. Vaccins des 9 mois. Choisissez votre jour au centre de santé.",
    );
  });
});
