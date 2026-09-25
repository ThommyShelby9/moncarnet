import { and, asc, eq, gt } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MotifRdv } from "@/domain/programmes";
import type { Db } from "@/server/db/client";
import { creneaux, patients, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { inscrireListeAttente, reserver } from "@/server/patient/reservation";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

async function creneau(motif: MotifRdv, date: string, moment: "matin" | "apres_midi" = "matin") {
  const [c] = await db.select().from(creneaux).where(and(eq(creneaux.motif, motif), eq(creneaux.date, date), eq(creneaux.moment, moment)));
  return c!;
}

async function creneauUnePlace(date: string) {
  const [codjo] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.prenom, "Codjo"));
  const [c] = await db.insert(creneaux).values({ etablissementId: codjo!.etablissementId, motif: "consultation", date, moment: "matin", capacite: 1 }).returning();
  return c!;
}

describe("reserver", () => {
  it("relie la place à l'étape de programme en attente : les vaccins des 9 mois de Sèna", async () => {
    const mercredi = await creneau("vaccin", "2026-09-30");
    const r = await reserver(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Sèna"), motif: "vaccin", creneauId: mercredi.id, aujourdhui });
    expect(r.ok).toBe(true);
    const [rdv] = await db.select().from(rendezVous).where(eq(rendezVous.id, r.ok ? r.donnees.rendezVousId : ""));
    expect(rdv).toMatchObject({ etapeCode: "9mois", datePrevue: "2026-09-30", moment: "matin", creneauId: mercredi.id, source: "programme" });
  });

  it("crée un rendez-vous « patient » quand aucune étape n'attend", async () => {
    const lundi = await creneau("consultation", "2026-10-05", "apres_midi");
    const r = await reserver(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Mariam"), motif: "fievre", creneauId: lundi.id, aujourdhui });
    expect(r.ok).toBe(true);
    const [rdv] = await db.select().from(rendezVous).where(eq(rendezVous.id, r.ok ? r.donnees.rendezVousId : ""));
    expect(rdv).toMatchObject({ motif: "fievre", source: "patient", creneauId: lundi.id, etapeCode: null });
  });

  it("refuse un deuxième rendez-vous le même jour", async () => {
    const lundiMatin = await creneau("consultation", "2026-10-05", "matin");
    const r = await reserver(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Mariam"), motif: "consultation", creneauId: lundiMatin.id, aujourdhui });
    expect(r).toEqual({ ok: false, erreur: "deja_reserve" });
  });

  it("refuse le carnet d'une autre famille", async () => {
    const mercredi = await creneau("vaccin", "2026-09-30");
    const r = await reserver(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Sèna"), motif: "vaccin", creneauId: mercredi.id, aujourdhui });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });

  it("refuse un créneau du jour même, ou d'un autre motif", async () => {
    const compteId = await idCompte(db, COMPTE.codjo);
    const codjo = await idPatient(db, "Codjo");
    const duJour = await creneau("consultation", aujourdhui);
    expect(await reserver(db, { compteId, patientId: codjo, motif: "consultation", creneauId: duJour.id, aujourdhui })).toEqual({ ok: false, erreur: "passe" });
    const vaccin = await creneau("vaccin", "2026-10-07");
    expect(await reserver(db, { compteId, patientId: codjo, motif: "tension", creneauId: vaccin.id, aujourdhui })).toEqual({ ok: false, erreur: "introuvable" });
  });

  it("donne la dernière place à une seule des deux réservations simultanées", async () => {
    const samedi = await creneauUnePlace("2026-10-10");
    const [a, b] = await Promise.all([
      reserver(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Codjo"), motif: "consultation", creneauId: samedi.id, aujourdhui }),
      reserver(db, { compteId: await idCompte(db, COMPTE.aicha), patientId: await idPatient(db, "Aïcha"), motif: "consultation", creneauId: samedi.id, aujourdhui }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toEqual({ ok: false, erreur: "complet" });
  });
});

describe("inscrireListeAttente", () => {
  it("n'inscrit qu'une fois la même demande", async () => {
    const [complet] = await db
      .select()
      .from(creneaux)
      .where(and(eq(creneaux.motif, "consultation"), eq(creneaux.moment, "matin"), gt(creneaux.date, aujourdhui)))
      .orderBy(asc(creneaux.date));
    const demande = { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Mariam"), motif: "consultation" as const, creneauId: complet!.id };
    const premiere = await inscrireListeAttente(db, demande);
    const seconde = await inscrireListeAttente(db, demande);
    expect(premiere.ok && seconde.ok && premiere.donnees.attenteId === seconde.donnees.attenteId).toBe(true);
  });

  it("refuse le carnet d'une autre famille", async () => {
    const mercredi = await creneau("vaccin", "2026-09-30");
    const r = await inscrireListeAttente(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Sèna"), motif: "vaccin", creneauId: mercredi.id });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });
});
