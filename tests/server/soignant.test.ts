import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { alertes, comptes, evenements, ordonnances } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { annulerAlerte, signalerDanger } from "@/server/patient/signalement";
import { programmesDuCarnet } from "@/server/requetes/carnet";
import { prendreEnCharge } from "@/server/soignant/alertes";
import { enregistrerConsultation, type Soignant } from "@/server/soignant/consultation";
import { emettreOrdonnance } from "@/server/soignant/ordonnance";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

let db: Db;
let fermer: () => Promise<void>;
let firmin: Soignant;
let adjoa: Soignant;
let autreCentre: string;

async function soignant(identifiant: string): Promise<Soignant> {
  const [c] = await db.select().from(comptes).where(eq(comptes.identifiant, identifiant));
  return { id: c!.id, etablissementId: c!.etablissementId };
}

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
  firmin = await soignant("firmin.akpovi");
  adjoa = await soignant("adjoa.gbaguidi");
  autreCentre = (await soignant("pharmacie.sainte-rita")).etablissementId!;
});
afterAll(async () => fermer());

describe("enregistrerConsultation", () => {
  it("enregistre la consultation de Codjo et sa tension, au nom du soignant", async () => {
    const codjo = await idPatient(db, "Codjo");
    const r = await enregistrerConsultation(db, { auteur: firmin, patientId: codjo, saisie: { motif: "tension", mesures: { tensionSys: 180, tensionDia: 110 } } });
    expect(r.ok).toBe(true);
    const [e] = await db.select().from(evenements).where(eq(evenements.id, r.ok ? r.donnees.evenementId : randomUUID()));
    expect(e).toMatchObject({ type: "consultation", auteurId: firmin.id, donnees: { motif: "tension", mesures: { tensionSys: 180, tensionDia: 110 } } });
  });

  it("enregistre les vaccins des 9 mois de Sèna : l'étape est faite dans son carnet", async () => {
    const sena = await idPatient(db, "Sèna");
    const r = await enregistrerConsultation(db, { auteur: adjoa, patientId: sena, saisie: { motif: "vaccin", etape: "9mois", mesures: {} } });
    const [e] = await db.select().from(evenements).where(eq(evenements.id, r.ok ? r.donnees.evenementId : randomUUID()));
    expect(e).toMatchObject({ type: "vaccination", donnees: { etape: "9mois", vaccins: ["Rougeole-rubéole 1", "fièvre jaune"] } });
    const [vaccination] = await programmesDuCarnet(db, sena, "2026-09-25");
    expect(vaccination?.etapes.find((x) => x.code === "9mois")?.statut).toBe("faite");
  });

  it("refuse une étape qui ne va pas avec le motif", async () => {
    const r = await enregistrerConsultation(db, { auteur: firmin, patientId: await idPatient(db, "Codjo"), saisie: { motif: "tension", etape: "cpn3", mesures: {} } });
    expect(r).toEqual({ ok: false, erreur: "etape_inconnue" });
  });

  it("refuse le patient d'un autre centre", async () => {
    const r = await enregistrerConsultation(db, {
      auteur: { id: firmin.id, etablissementId: autreCentre },
      patientId: await idPatient(db, "Codjo"),
      saisie: { motif: "consultation", mesures: {} },
    });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });
});

describe("emettreOrdonnance", () => {
  const lignes = [{ medicament: "Amlodipine 10 mg", matin: 0, midi: 0, soir: 1, dureeJours: 30, indication: "la tension" }];

  it("crée l'ordonnance avec un code de retrait", async () => {
    const r = await emettreOrdonnance(db, { auteur: firmin, patientId: await idPatient(db, "Codjo"), lignes });
    expect(r.ok && r.donnees.codeRetrait).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const [o] = await db.select().from(ordonnances).where(eq(ordonnances.id, r.ok ? r.donnees.ordonnanceId : randomUUID()));
    expect(o).toMatchObject({ prescripteurId: firmin.id, lignes });
  });

  it("prend un autre code quand le premier est déjà utilisé", async () => {
    const codes = ["K7P4QX", "ZZZZZ2"];
    const r = await emettreOrdonnance(db, { auteur: firmin, patientId: await idPatient(db, "Codjo"), lignes, genererCode: () => codes.shift()! });
    expect(r).toMatchObject({ ok: true, donnees: { codeRetrait: "ZZZZZ2" } });
  });

  it("refuse le patient d'un autre centre", async () => {
    const r = await emettreOrdonnance(db, { auteur: { id: firmin.id, etablissementId: autreCentre }, patientId: await idPatient(db, "Codjo"), lignes });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });
});

describe("prendreEnCharge", () => {
  async function signalement() {
    const s = await signalerDanger(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Awa"), evenementId: randomUUID(), signes: ["saignement"] });
    return s.ok ? s.donnees.alerteId : "";
  }

  it("donne l'alerte au premier soignant qui la prend, pas au second", async () => {
    const alerteId = await signalement();
    const [a, b] = await Promise.all([prendreEnCharge(db, { auteur: adjoa, alerteId }), prendreEnCharge(db, { auteur: firmin, alerteId })]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toEqual({ ok: false, erreur: "deja_prise" });
    const [alerte] = await db.select().from(alertes).where(eq(alertes.id, alerteId));
    expect(alerte?.priseEnChargeLe).not.toBeNull();
  });

  it("ne montre pas l'alerte d'un autre centre, et refuse une alerte annulée", async () => {
    const alerteId = await signalement();
    expect(await prendreEnCharge(db, { auteur: { id: firmin.id, etablissementId: autreCentre }, alerteId })).toEqual({ ok: false, erreur: "introuvable" });
    await annulerAlerte(db, { compteId: await idCompte(db, COMPTE.awa), alerteId });
    expect(await prendreEnCharge(db, { auteur: adjoa, alerteId })).toEqual({ ok: false, erreur: "annulee" });
  });
});
