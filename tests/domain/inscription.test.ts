import { describe, expect, it } from "vitest";
import { lireInscription } from "@/domain/inscription";

const foyerId = "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f";
const aujourdhui = "2026-09-25";

describe("lireInscription", () => {
  it("inscrit un nouveau-né au calendrier des vaccins à partir de sa naissance", () => {
    expect(lireInscription({ type: "nouveau_ne", foyerId, prenom: "Yao", nom: "Dossou", sexe: "M", nele: "2026-09-20" }, aujourdhui)).toEqual({
      ok: true,
      donnees: { foyerId, prenom: "Yao", nom: "Dossou", sexe: "M", dateNaissance: "2026-09-20", programme: { code: "vaccination", dateReference: "2026-09-20" } },
    });
  });

  it("inscrit une femme enceinte à partir de ses semaines de grossesse", () => {
    expect(lireInscription({ type: "grossesse", foyerId, prenom: "Reine", nom: "Kiki", sexe: "F", age: "22", semaines: "20" }, aujourdhui)).toMatchObject({
      ok: true,
      donnees: { dateNaissance: "2004-09-30", programme: { code: "grossesse", dateReference: "2026-05-08" } },
    });
  });

  it("garde un numéro de téléphone au bon format", () => {
    expect(lireInscription({ type: "tension", foyerId, prenom: "Noël", nom: "Kiki", sexe: "M", age: "61", telephone: "01 97 12 34 56" }, aujourdhui)).toMatchObject({
      ok: true,
      donnees: { telephone: "+2290197123456", programme: { code: "hypertension", dateReference: aujourdhui } },
    });
  });

  it("explique ce qui manque", () => {
    expect(lireInscription({ type: "tension", foyerId, prenom: "Noël", nom: "Kiki", sexe: "M" }, aujourdhui)).toEqual({ ok: false, message: "Indiquez l'âge." });
    expect(lireInscription({ type: "grossesse", foyerId, prenom: "Yao", nom: "Kiki", sexe: "M", age: "30", semaines: "12" }, aujourdhui)).toEqual({
      ok: false,
      message: "Une grossesse concerne une femme : vérifiez le sexe.",
    });
    expect(lireInscription({ type: "nouveau_ne", foyerId, prenom: "Yao", nom: "Kiki", sexe: "M", nele: "2025-01-01" }, aujourdhui)).toEqual({
      ok: false,
      message: "Indiquez la date de naissance du bébé (moins d'un an).",
    });
    expect(lireInscription({ type: "tension", foyerId, prenom: "", nom: "Kiki", sexe: "M", age: "61" }, aujourdhui)).toEqual({ ok: false, message: "Vérifiez : le prénom." });
    expect(lireInscription({ type: "tension", foyerId, prenom: "Noël", nom: "Kiki", sexe: "M", age: "61", telephone: "12" }, aujourdhui)).toEqual({
      ok: false,
      message: "Le numéro de téléphone n'est pas un numéro du Bénin.",
    });
  });
});
