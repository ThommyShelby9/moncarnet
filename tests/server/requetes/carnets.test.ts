import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { carnetsDuCompte, choisirCarnet, etablissementDuPatient, type Carnet } from "@/server/requetes/carnets";
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

describe("programmes et établissement du carnet", () => {
  it("indique les programmes suivis et le centre de rattachement", async () => {
    const [codjo] = await db.select().from(comptes).where(eq(comptes.identifiant, "+2290197000001"));
    const carnets = await carnetsDuCompte(db, codjo!.id, "2026-09-25");
    expect(carnets.map((c) => c.programmes)).toEqual([["hypertension"], ["consultation"], ["vaccination"]]);
    expect(carnets[0]?.codeCourt).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    // La langue du carnet : celle dans laquelle on lui fait entendre les conseils.
    expect(carnets[0]?.langue).toBe("fon");
    expect(await etablissementDuPatient(db, carnets[0]!.patientId)).toEqual({ nom: "Centre de santé de Bohicon", telephone: "+2290121000000" });
  });
});

describe("choisirCarnet", () => {
  const carnets = [
    { patientId: "a", lien: "conjoint" },
    { patientId: "b", lien: "soi" },
  ] as Carnet[];

  it("prend le carnet demandé s'il est dans la famille", () => {
    expect(choisirCarnet(carnets, "a")?.patientId).toBe("a");
  });

  it("revient au carnet du titulaire pour un carnet inconnu", () => {
    expect(choisirCarnet(carnets, "zzz")?.patientId).toBe("b");
    expect(choisirCarnet(carnets, undefined)?.patientId).toBe("b");
  });

  it("ne renvoie rien sans carnet", () => {
    expect(choisirCarnet([], undefined)).toBeNull();
  });
});
