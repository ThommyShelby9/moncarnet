import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes, patients } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { nommerEnfant } from "@/server/patient/prenom";
import { declarerNaissance } from "@/server/soignant/naissance";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

let db: Db;
let fermer: () => Promise<void>;
let bebeId: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-26" });
  const [adjoa] = await db.select().from(comptes).where(eq(comptes.identifiant, "adjoa.gbaguidi"));
  const r = await declarerNaissance(db, {
    auteur: { id: adjoa!.id, etablissementId: adjoa!.etablissementId },
    mereId: await idPatient(db, "Awa"),
    saisie: { le: new Date("2026-09-26T05:40:00Z"), lieu: "centre", mode: "voie_basse", sexe: "F", prenom: null, poidsGrammes: 3200, vaccinsNaissance: true },
  });
  bebeId = r.ok ? r.donnees.bebeId : "";
});
afterAll(async () => fermer());

describe("nommerEnfant", () => {
  it("laisse la famille donner le prénom, une fois", async () => {
    const awa = await idCompte(db, COMPTE.awa);
    expect(await nommerEnfant(db, { compteId: awa, patientId: bebeId, prenom: "  Sènami " })).toEqual({ ok: true, donnees: { prenom: "Sènami" } });
    expect((await db.select().from(patients).where(eq(patients.id, bebeId)))[0]?.prenom).toBe("Sènami");
    expect(await nommerEnfant(db, { compteId: awa, patientId: bebeId, prenom: "Autre" })).toEqual({ ok: false, erreur: "deja_nomme" });
  });

  it("refuse un autre compte et un prénom vide", async () => {
    expect(await nommerEnfant(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: bebeId, prenom: "X" })).toEqual({ ok: false, erreur: "interdit" });
    expect(await nommerEnfant(db, { compteId: await idCompte(db, COMPTE.awa), patientId: bebeId, prenom: " " })).toEqual({ ok: false, erreur: "invalide" });
  });
});
