import { describe, expect, it } from "vitest";
import { evenementSchema } from "@/domain/evenements";
import { evenementEntrantSchema } from "@/domain/synchronisation";
import { versServeur } from "@/offline/file";
import { saisieDInscription, saisiesDeVisite } from "@/offline/saisies";

const compteur = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const afiavi = { id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f", prenom: "Afiavi", nom: "Dossou" };

describe("saisiesDeVisite", () => {
  it("fait partir le signe de danger, puis la tension, puis la visite avec sa note", () => {
    const saisies = saisiesDeVisite(
      { personne: afiavi, constat: "a_orienter", tension: { sys: 150, dia: 95 }, signes: ["maux_de_tete"], avecNote: true, texte: "Voit trouble" },
      new Date("2026-09-25T09:30:00Z"),
      compteur(),
    );
    expect(saisies.map((s) => [s.type, s.id, s.groupe])).toEqual([
      ["signalement_danger", "id-2", "id-1"],
      ["mesure", "id-3", "id-1"],
      ["visite_domicile", "id-1", "id-1"],
    ]);
    expect(saisies[0]?.donnees).toEqual({ signes: ["maux_de_tete"], source: "relais" });
    expect(saisies[1]?.donnees).toEqual({ mesures: { tensionSys: 150, tensionDia: 95 } });
    expect(saisies[2]).toMatchObject({
      patientId: afiavi.id,
      survenuLe: "2026-09-25T09:30:00.000Z",
      donnees: { constat: "a_orienter", noteVocale: true, texte: "Voit trouble" },
      libelle: "Visite chez Afiavi Dossou",
      avecNote: true,
      nature: "visite",
    });
  });

  it("réduit une visite simple à une seule saisie", () => {
    expect(saisiesDeVisite({ personne: afiavi, constat: "absent", signes: [], avecNote: false }, new Date(), compteur())).toEqual([
      expect.objectContaining({ id: "id-1", type: "visite_domicile", donnees: { constat: "absent", noteVocale: false } }),
    ]);
  });

  it("produit des saisies que le serveur sait lire", () => {
    const saisies = saisiesDeVisite(
      { personne: afiavi, constat: "a_orienter", tension: { sys: 150, dia: 95 }, signes: ["saignement"], avecNote: false },
      new Date(),
    );
    for (const s of saisies) {
      expect(evenementEntrantSchema.safeParse(versServeur(s)).success).toBe(true);
      expect(evenementSchema.safeParse({ type: s.type, donnees: s.donnees }).success).toBe(true);
    }
  });
});

describe("saisieDInscription", () => {
  it("donne au nouveau carnet un identifiant différent de celui de l'inscription", () => {
    const s = saisieDInscription({ foyerId: afiavi.id, prenom: "Yao", nom: "Dossou", sexe: "M", dateNaissance: "2026-09-20" }, new Date(), compteur());
    expect(s).toMatchObject({ id: "id-1", patientId: "id-2", type: "inscription", libelle: "Inscription de Yao Dossou", groupe: "id-1", nature: "inscription" });
  });
});
