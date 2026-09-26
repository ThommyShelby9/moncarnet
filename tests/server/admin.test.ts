import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { etatDeLaDemo } from "@/server/demo/etat";
import { semerDemo } from "@/server/demo/semer";
import { COMPTES_DEMO } from "@/server/demo/donnees";
import { creerDbDeTest } from "../aides/base-de-test";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-26" });
});
afterAll(async () => fermer());

describe("etatDeLaDemo", () => {
  it("compte ce que contient la démo, pour l'administration", async () => {
    const etat = await etatDeLaDemo(db, "2026-09-26");
    expect(etat).toMatchObject({ comptes: COMPTES_DEMO.length, foyers: 75, alertesEnCours: 0 });
    expect(etat.carnets).toBeGreaterThan(100);
    expect(etat.enSalleAttente).toBeGreaterThanOrEqual(2);
  });
});
