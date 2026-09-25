import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { lienAvecPatient } from "@/server/droits";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
});
afterAll(async () => fermer());

describe("lienAvecPatient", () => {
  it("donne le lien du compte avec un carnet de sa famille", async () => {
    expect(await lienAvecPatient(db, await idCompte(db, COMPTE.codjo), await idPatient(db, "Sèna"))).toBe("aidant");
    expect(await lienAvecPatient(db, await idCompte(db, COMPTE.codjo), await idPatient(db, "Codjo"))).toBe("soi");
  });

  it("refuse le carnet d'une autre famille", async () => {
    expect(await lienAvecPatient(db, await idCompte(db, COMPTE.codjo), await idPatient(db, "Awa"))).toBeNull();
  });

  it("refuse sans erreur un identifiant qui n'en est pas un", async () => {
    expect(await lienAvecPatient(db, await idCompte(db, COMPTE.codjo), "n'importe-quoi")).toBeNull();
  });
});
