import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { evenements, ordonnances } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { noterPrise } from "@/server/patient/prises";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

let db: Db;
let fermer: () => Promise<void>;
let cle: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
  const [ordonnance] = await db.select().from(ordonnances).where(eq(ordonnances.codeRetrait, "K7P4QX"));
  cle = `${ordonnance!.id}:0`;
});
afterAll(async () => fermer());

describe("noterPrise", () => {
  it("note « C'est fait » dans le journal, avec son auteur", async () => {
    const compte = await idCompte(db, COMPTE.codjo);
    const codjo = await idPatient(db, "Codjo");
    const r = await noterPrise(db, { compteId: compte, patientId: codjo, traitementCle: cle, moment: "soir", statut: "fait", maintenant: new Date("2026-09-25T19:05:00Z") });
    expect(r.ok).toBe(true);
    const [prise] = await db.select().from(evenements).where(and(eq(evenements.patientId, codjo), eq(evenements.type, "prise_medicament")));
    expect(prise).toMatchObject({ auteurId: compte, donnees: { traitement: cle, moment: "soir", statut: "fait" } });
  });

  it("refuse le traitement d'une autre personne de la famille", async () => {
    const r = await noterPrise(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Mariam"), traitementCle: cle, moment: "soir", statut: "fait" });
    expect(r).toEqual({ ok: false, erreur: "introuvable" });
  });

  it("refuse une clé de traitement inventée", async () => {
    const r = await noterPrise(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Codjo"), traitementCle: "abc:0", moment: "soir", statut: "fait" });
    expect(r).toEqual({ ok: false, erreur: "introuvable" });
  });

  it("refuse le carnet d'une autre famille", async () => {
    const r = await noterPrise(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Codjo"), traitementCle: cle, moment: "soir", statut: "fait" });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });
});
