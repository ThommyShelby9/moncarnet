import { and, asc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifierIdentifiants } from "@/server/auth/connexion";
import type { Db } from "@/server/db/client";
import { comptes, creneaux, evenements, foyers, inscriptions, listeAttente, ordonnances, passages, patients, rendezVous, responsables } from "@/server/db/schema";
import { COMPTES_DEMO } from "@/server/demo/donnees";
import { semerDemo } from "@/server/demo/semer";
import { creerDbDeTest } from "../../aides/base-de-test";

let db: Db;
let fermer: () => Promise<void>;
const aujourdhui = "2026-09-25";

beforeEach(async () => {
  ({ db, fermer } = await creerDbDeTest());
});
afterEach(async () => fermer());

describe("semerDemo", () => {
  it("crée les personnages, les comptes et un historique", async () => {
    const bilan = await semerDemo(db, { aujourdhui });
    expect(bilan.comptes).toBe(COMPTES_DEMO.length);
    // 24 foyers des personnages et de la population, 51 foyers suivis depuis un an à Bohicon (pilotage).
    expect(bilan.foyers).toBe(75);
    expect(bilan.patients).toBeGreaterThanOrEqual(47);
    expect(bilan.rendezVous).toBeGreaterThan(80);
    expect(bilan.evenements).toBeGreaterThan(40);
  });

  it("donne à Codjo les carnets de sa femme et de son petit-fils", async () => {
    await semerDemo(db, { aujourdhui });
    const [codjo] = await db.select().from(comptes).where(eq(comptes.identifiant, "+2290197000001"));
    const carnets = await db
      .select({ prenom: patients.prenom, lien: responsables.lien })
      .from(responsables)
      .innerJoin(patients, eq(responsables.patientId, patients.id))
      .where(eq(responsables.compteId, codjo!.id));
    expect(carnets.map((c) => `${c.prenom}:${c.lien}`).sort()).toEqual(["Codjo:soi", "Mariam:conjoint", "Sèna:aidant"]);
  });

  it("permet de se connecter avec chaque compte de démonstration", async () => {
    await semerDemo(db, { aujourdhui });
    for (const compte of COMPTES_DEMO) {
      expect(await verifierIdentifiants(db, compte.identifiant, compte.secret)).toMatchObject({ ok: true, role: compte.role });
    }
  });

  it("ouvre des places sur les 3 prochaines semaines", async () => {
    await semerDemo(db, { aujourdhui });
    const places = await db.select().from(creneaux);
    expect(places.length).toBeGreaterThan(30);
    expect(places.every((c) => c.date >= aujourdhui && c.date <= "2026-10-16")).toBe(true);
  });

  it("prépare l'espace patient : traitements délivrés, places prises et réservations", async () => {
    await semerDemo(db, { aujourdhui });
    expect(await db.select().from(evenements).where(eq(evenements.type, "delivrance"))).toHaveLength(2);

    const aVenir = await db.select().from(creneaux).where(gt(creneaux.date, aujourdhui)).orderBy(asc(creneaux.date), asc(creneaux.moment));
    const reserves = async (id: string) =>
      (await db.select().from(rendezVous).where(and(eq(rendezVous.creneauId, id), isNull(rendezVous.annuleLe)))).length;
    const vaccin = aVenir.find((c) => c.motif === "vaccin")!;
    expect(vaccin.date).toBe("2026-09-30");
    expect(vaccin.capacite - (await reserves(vaccin.id))).toBe(3);
    const consultation = aVenir.find((c) => c.motif === "consultation" && c.moment === "matin")!;
    expect(await reserves(consultation.id)).toBe(consultation.capacite);

    const [codjo] = await db.select().from(patients).where(eq(patients.prenom, "Codjo"));
    const places = await db.select().from(rendezVous).where(and(eq(rendezVous.patientId, codjo!.id), isNotNull(rendezVous.creneauId)));
    expect(places).toEqual([expect.objectContaining({ motif: "tension", datePrevue: "2026-10-01", source: "programme" })]);
  });

  it("prépare le poste soignant et la pharmacie : consultations du jour et ordonnance à délivrer", async () => {
    await semerDemo(db, { aujourdhui });
    const plagesDuJour = await db.select().from(creneaux).where(eq(creneaux.date, aujourdhui));
    const prises = await db.select().from(rendezVous).where(and(eq(rendezVous.datePrevue, aujourdhui), isNotNull(rendezVous.creneauId)));
    expect(plagesDuJour.length).toBeGreaterThan(0);
    expect(prises.length).toBeGreaterThan(plagesDuJour.length);
    const vusAujourdhui = (await db.select().from(evenements).where(eq(evenements.type, "consultation"))).filter(
      (e) => e.survenuLe.toISOString().slice(0, 10) === aujourdhui,
    );
    expect(vusAujourdhui.length).toBeGreaterThan(0);
    const [aDelivrer] = await db.select().from(ordonnances).where(eq(ordonnances.codeRetrait, "M4R2TN"));
    expect(aDelivrer?.lignes).toEqual([expect.objectContaining({ medicament: "Paracétamol 500 mg", dureeJours: 5 })]);
  });

  it("peut être relancée sans erreur et donne le même résultat", async () => {
    const premier = await semerDemo(db, { aujourdhui });
    const second = await semerDemo(db, { aujourdhui });
    expect(second).toEqual(premier);
  });

  it("donne à Koffi les foyers de Sèhoun et un mois de visites, dont celle chez Rachida", async () => {
    await semerDemo(db, { aujourdhui });
    const [koffi] = await db.select().from(comptes).where(eq(comptes.identifiant, "koffi.agbessi"));
    const suivis = await db.select().from(foyers).where(eq(foyers.relaisId, koffi!.id));
    expect(suivis.map((f) => f.nom)).toEqual(expect.arrayContaining(["Dossou", "Salifou"]));
    expect(suivis.map((f) => f.nom)).not.toContain("Houngbo");
    expect(suivis.every((f) => ["Sèhoun", "Kinta", "Adingnigon"].includes(f.village))).toBe(true);
    const visites = await db.select().from(evenements).where(eq(evenements.type, "visite_domicile"));
    expect(visites.length).toBeGreaterThanOrEqual(10);
    expect(visites.every((v) => v.auteurId === koffi!.id && v.survenuLe < new Date(`${aujourdhui}T00:00:00+01:00`))).toBe(true);
    expect(visites.filter((v) => v.donnees.constat === "a_orienter").length).toBeGreaterThanOrEqual(2);
    const rachida = (await db.select().from(patients).where(eq(patients.prenom, "Rachida")))[0]!;
    expect(visites.filter((v) => v.patientId === rachida.id)).toEqual([expect.objectContaining({ donnees: { constat: "tout_va_bien", noteVocale: false } })]);
  });

  it("met Awa à 37 semaines, consultations faites et naissance en préparation", async () => {
    await semerDemo(db, { aujourdhui });
    const [awa] = await db.select().from(patients).where(eq(patients.prenom, "Awa"));
    const [grossesse] = await db.select().from(inscriptions).where(and(eq(inscriptions.patientId, awa!.id), eq(inscriptions.programme, "grossesse")));
    expect(grossesse?.dateReference).toBe("2026-01-07");
    const consultations = await db.select().from(evenements).where(and(eq(evenements.patientId, awa!.id), eq(evenements.type, "consultation")));
    expect(consultations.map((c) => c.donnees.etape).sort()).toEqual(["cpn1", "cpn2", "cpn3", "cpn4"]);
    const [plan] = await db.select().from(evenements).where(and(eq(evenements.patientId, awa!.id), eq(evenements.type, "plan_naissance")));
    expect(plan?.donnees).toEqual({ elements: ["lieu", "accompagnant", "sac"] });
    const reserves = await db.select().from(rendezVous).where(and(eq(rendezVous.patientId, awa!.id), isNotNull(rendezVous.creneauId)));
    expect(reserves).toEqual([]);
  });

  it("prépare la salle d'attente du jour : des personnes attendent, Mariam a rendez-vous ce matin", async () => {
    await semerDemo(db, { aujourdhui });
    const [mariam] = await db.select().from(patients).where(eq(patients.prenom, "Mariam"));
    const rdvDuJour = await db.select().from(rendezVous).where(and(eq(rendezVous.patientId, mariam!.id), eq(rendezVous.datePrevue, aujourdhui), isNotNull(rendezVous.creneauId)));
    expect(rdvDuJour).toHaveLength(1);
    const lesPassages = await db.select().from(passages).where(eq(passages.jour, aujourdhui));
    expect(lesPassages.filter((p) => p.appeleLe === null).length).toBeGreaterThanOrEqual(2);
    expect(lesPassages.filter((p) => p.appeleLe !== null).length).toBeGreaterThanOrEqual(1);
  });

  it("ne donne jamais deux places le même jour à une personne, et met des personnes en liste d'attente des plages complètes", async () => {
    await semerDemo(db, { aujourdhui });
    const places = await db.select({ patientId: rendezVous.patientId, jour: rendezVous.datePrevue }).from(rendezVous).where(and(isNotNull(rendezVous.creneauId), isNull(rendezVous.annuleLe)));
    const cles = places.map((p) => `${p.patientId}|${p.jour}`);
    expect(new Set(cles).size).toBe(cles.length);
    expect((await db.select().from(listeAttente)).length).toBe(5);
  });
});
