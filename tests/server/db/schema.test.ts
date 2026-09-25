import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { communes, comptes, etablissements, patients, responsables } from "@/server/db/schema";
import { creerDbDeTest } from "../../aides/base-de-test";

let db: Db;
let fermer: () => Promise<void>;

beforeEach(async () => {
  ({ db, fermer } = await creerDbDeTest());
});
afterEach(async () => fermer());

async function etablissement() {
  const [commune] = await db.insert(communes).values({ nom: "Bohicon", departement: "Zou" }).returning();
  const [cs] = await db
    .insert(etablissements)
    .values({ nom: "Centre de santé de Bohicon", type: "centre_sante", communeId: commune!.id })
    .returning();
  return cs!;
}

describe("schéma", () => {
  it("applique les migrations et enregistre un patient", async () => {
    const cs = await etablissement();
    await db.insert(patients).values({
      prenom: "Codjo",
      nom: "Houngbo",
      dateNaissance: "1968-03-12",
      sexe: "M",
      codeCourt: "HNG7K2",
      etablissementId: cs.id,
    });
    const [lu] = await db.select().from(patients).where(eq(patients.codeCourt, "HNG7K2"));
    expect(lu?.dateNaissance).toBe("1968-03-12");
    expect(lu?.langue).toBe("fon");
    expect(lu?.antecedents).toEqual({});
  });

  it("refuse deux carnets avec le même code", async () => {
    const cs = await etablissement();
    const patient = { prenom: "A", nom: "B", dateNaissance: "2000-01-01", sexe: "F" as const, codeCourt: "DBL001", etablissementId: cs.id };
    await db.insert(patients).values(patient);
    await expect(db.insert(patients).values(patient)).rejects.toThrow();
  });

  it("refuse de lier deux fois le même carnet au même compte", async () => {
    const cs = await etablissement();
    const [compte] = await db
      .insert(comptes)
      .values({ role: "patient", identifiant: "+2290197000001", nomAffiche: "Codjo", empreinteSecret: "x" })
      .returning();
    const [patient] = await db
      .insert(patients)
      .values({ prenom: "Codjo", nom: "Houngbo", dateNaissance: "1968-03-12", sexe: "M", codeCourt: "HNG001", etablissementId: cs.id })
      .returning();
    const lien = { compteId: compte!.id, patientId: patient!.id, lien: "soi" as const };
    await db.insert(responsables).values(lien);
    await expect(db.insert(responsables).values(lien)).rejects.toThrow();
  });
});
