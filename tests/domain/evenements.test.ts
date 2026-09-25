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

  it("accepte un signalement de danger et refuse un signalement sans signe", () => {
    const donnees = { signes: ["saignement"], source: "patient" };
    expect(evenementSchema.safeParse({ type: "signalement_danger", donnees }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "signalement_danger", donnees: { ...donnees, signes: [] } }).success).toBe(false);
    expect(evenementSchema.safeParse({ type: "signalement_danger", donnees: { ...donnees, signes: ["inconnu"] } }).success).toBe(false);
  });

  it("accepte une délivrance d'ordonnance", () => {
    const r = evenementSchema.safeParse({ type: "delivrance", donnees: { ordonnanceId: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f" } });
    expect(r.success).toBe(true);
  });

  it("accepte l'annulation d'une prise", () => {
    const r = evenementSchema.safeParse({ type: "prise_medicament", donnees: { traitement: "ord:0", moment: "soir", statut: "annule" } });
    expect(r.success).toBe(true);
  });

  it("refuse un type inconnu", () => {
    expect(evenementSchema.safeParse({ type: "inconnu", donnees: {} }).success).toBe(false);
  });

  it("accepte une visite à domicile et une inscription faite par le relais", () => {
    const foyerId = "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f";
    expect(evenementSchema.safeParse({ type: "visite_domicile", donnees: { constat: "a_orienter", noteVocale: true } }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "visite_domicile", donnees: { constat: "peut-etre" } }).success).toBe(false);
    const inscription = { foyerId, prenom: "Yao", nom: "Dossou", sexe: "M", dateNaissance: "2026-09-20", programme: { code: "vaccination", dateReference: "2026-09-20" } };
    expect(evenementSchema.safeParse({ type: "inscription", donnees: inscription }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "inscription", donnees: { ...inscription, prenom: " " } }).success).toBe(false);
  });

  it("accepte un accouchement et un plan de naissance", () => {
    const enfant = { id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f", sexe: "F", poidsGrammes: 3200 };
    expect(evenementSchema.safeParse({ type: "accouchement", donnees: { le: "2026-09-26T05:40:00.000Z", lieu: "centre", mode: "voie_basse", enfant } }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "accouchement", donnees: { le: "2026-09-26T05:40:00.000Z", lieu: "lune", mode: "voie_basse", enfant } }).success).toBe(false);
    expect(evenementSchema.safeParse({ type: "plan_naissance", donnees: { elements: ["lieu", "sac"] } }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "plan_naissance", donnees: { elements: ["piscine"] } }).success).toBe(false);
  });

  it("connaît le début du travail parmi les signes de danger", () => {
    expect(evenementSchema.safeParse({ type: "signalement_danger", donnees: { signes: ["debut_travail"], source: "patient" } }).success).toBe(true);
  });
});
