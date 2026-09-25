import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { carnetsDuCompte } from "@/server/requetes/carnets";
import { creerDbDeTest } from "../../aides/base-de-test";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
});
afterAll(async () => fermer());

describe("carnetsDuCompte", () => {
  it("liste le carnet du titulaire en premier, puis sa famille", async () => {
    const [codjo] = await db.select().from(comptes).where(eq(comptes.identifiant, "+2290197000001"));
    const carnets = await carnetsDuCompte(db, codjo!.id, "2026-09-25");
    expect(carnets.map((c) => c.prenom)).toEqual(["Codjo", "Mariam", "Sèna"]);
    expect(carnets[0]).toMatchObject({ lien: "soi", age: 58 });
    expect(carnets[2]?.libelleAge).toBe("8 mois");
  });

  it("ne renvoie rien pour un compte sans carnet", async () => {
    const [firmin] = await db.select().from(comptes).where(eq(comptes.identifiant, "firmin.akpovi"));
    expect(await carnetsDuCompte(db, firmin!.id, "2026-09-25")).toEqual([]);
  });
});
