import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CodeSigne } from "@/domain/signes-danger";
import type { Db } from "@/server/db/client";
import { alertes, evenements } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { annulerAlerte, signalerDanger } from "@/server/patient/signalement";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
});
afterAll(async () => fermer());

describe("signalerDanger", () => {
  it("crée le signalement et une alerte au centre, avec 15 minutes pour la prendre en charge", async () => {
    const evenementId = randomUUID();
    const r = await signalerDanger(db, {
      compteId: await idCompte(db, COMPTE.awa),
      patientId: await idPatient(db, "Awa"),
      evenementId,
      signes: ["saignement"],
      maintenant: new Date("2026-09-25T19:14:00Z"),
    });
    expect(r).toMatchObject({ ok: true, donnees: { etablissement: { nom: "Centre de santé de Bohicon", telephone: "+2290121000000" } } });
    expect(r.ok && r.donnees.echeance.toISOString()).toBe("2026-09-25T19:29:00.000Z");
    const [evenement] = await db.select().from(evenements).where(eq(evenements.id, evenementId));
    expect(evenement).toMatchObject({ type: "signalement_danger", donnees: { signes: ["saignement"], source: "patient" } });
  });

  it("ne crée qu'une alerte quand le même signalement arrive deux fois", async () => {
    const envoi = { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Awa"), evenementId: randomUUID(), signes: ["fievre"] as CodeSigne[] };
    const premier = await signalerDanger(db, envoi);
    const second = await signalerDanger(db, envoi);
    expect(premier.ok && second.ok && premier.donnees.alerteId === second.donnees.alerteId).toBe(true);
    expect(await db.select().from(alertes).where(eq(alertes.evenementId, envoi.evenementId))).toHaveLength(1);
  });

  it("note la source « proche » quand un parent signale pour l'enfant", async () => {
    const evenementId = randomUUID();
    await signalerDanger(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Sèna"), evenementId, signes: ["diarrhee"] });
    const [evenement] = await db.select().from(evenements).where(eq(evenements.id, evenementId));
    expect(evenement?.donnees).toMatchObject({ source: "proche" });
  });

  it("refuse un signe inconnu et le carnet d'une autre famille", async () => {
    const awa = await idPatient(db, "Awa");
    const inconnu = await signalerDanger(db, { compteId: await idCompte(db, COMPTE.awa), patientId: awa, evenementId: randomUUID(), signes: ["xx" as CodeSigne] });
    expect(inconnu).toEqual({ ok: false, erreur: "invalide" });
    const autreFamille = await signalerDanger(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: awa, evenementId: randomUUID(), signes: ["fievre"] });
    expect(autreFamille).toEqual({ ok: false, erreur: "interdit" });
  });
});

describe("annulerAlerte", () => {
  it("annule une alerte envoyée par erreur, seulement depuis la famille", async () => {
    const envoi = await signalerDanger(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Awa"), evenementId: randomUUID(), signes: ["autre"] });
    const alerteId = envoi.ok ? envoi.donnees.alerteId : "";
    expect(await annulerAlerte(db, { compteId: await idCompte(db, COMPTE.codjo), alerteId })).toEqual({ ok: false, erreur: "interdit" });
    expect(await annulerAlerte(db, { compteId: await idCompte(db, COMPTE.awa), alerteId })).toEqual({ ok: true, donnees: null });
    const [alerte] = await db.select().from(alertes).where(eq(alertes.id, alerteId));
    expect(alerte?.annuleeLe).not.toBeNull();
  });
});
