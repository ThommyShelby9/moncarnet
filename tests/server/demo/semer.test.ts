import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifierIdentifiants } from "@/server/auth/connexion";
import type { Db } from "@/server/db/client";
import { comptes, creneaux, patients, responsables } from "@/server/db/schema";
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
    expect(bilan.foyers).toBe(24);
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

  it("peut être relancée sans erreur et donne le même résultat", async () => {
    const premier = await semerDemo(db, { aujourdhui });
    const second = await semerDemo(db, { aujourdhui });
    expect(second).toEqual(premier);
  });
});
