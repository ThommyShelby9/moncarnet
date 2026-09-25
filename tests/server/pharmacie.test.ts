import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { delivrer, ordonnanceParCode } from "@/server/pharmacie/delivrance";
import { traitementsDes } from "@/server/requetes/accueil";
import { ordonnancesDe } from "@/server/requetes/ordonnances";
import { creerDbDeTest } from "../aides/base-de-test";
import { idCompte, idPatient } from "../aides/demo";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
});
afterAll(async () => fermer());

describe("ordonnanceParCode", () => {
  it("montre l'ordonnance et de quoi la remettre, jamais le dossier", async () => {
    const o = await ordonnanceParCode(db, "M4R2TN");
    expect(o).toMatchObject({ codeRetrait: "M4R2TN", prescripteur: "Firmin Akpovi", delivrance: null, patient: { prenom: "Mariam", nom: "Houngbo", anneeNaissance: 1972 } });
    expect(Object.keys(o!.patient).sort()).toEqual(["anneeNaissance", "nom", "prenom"]);
  });

  it("dit qui a délivré une ordonnance déjà délivrée", async () => {
    expect((await ordonnanceParCode(db, "K7P4QX"))?.delivrance).toMatchObject({ par: "Pharmacie Sainte-Rita" });
  });

  it("ne trouve rien pour un code inconnu", async () => {
    expect(await ordonnanceParCode(db, "ZZZZZZ")).toBeNull();
  });
});

describe("delivrer", () => {
  it("délivre une seule fois, même touché deux fois, et les prises arrivent dans le carnet", async () => {
    const pharmacie = await idCompte(db, "pharmacie.sainte-rita");
    const o = await ordonnanceParCode(db, "M4R2TN");
    const maintenant = new Date("2026-09-25T10:00:00Z");
    const [a, b] = await Promise.all([
      delivrer(db, { auteurId: pharmacie, ordonnanceId: o!.id, maintenant }),
      delivrer(db, { auteurId: pharmacie, ordonnanceId: o!.id, maintenant }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toEqual({ ok: false, erreur: "deja_delivree" });
    expect((await ordonnanceParCode(db, "M4R2TN"))?.delivrance).toMatchObject({ par: "Pharmacie Sainte-Rita" });
    const traitements = await traitementsDes(db, [await idPatient(db, "Mariam")], "2026-09-25");
    expect(traitements.map((t) => t.medicament)).toEqual(["Paracétamol 500 mg"]);
  });

  it("refuse une ordonnance inconnue", async () => {
    const pharmacie = await idCompte(db, "pharmacie.sainte-rita");
    expect(await delivrer(db, { auteurId: pharmacie, ordonnanceId: randomUUID() })).toEqual({ ok: false, erreur: "introuvable" });
    expect(await delivrer(db, { auteurId: pharmacie, ordonnanceId: "abc" })).toEqual({ ok: false, erreur: "introuvable" });
  });
});

describe("ordonnancesDe", () => {
  it("liste les ordonnances d'une personne avec leur délivrance", async () => {
    expect(await ordonnancesDe(db, await idPatient(db, "Codjo"))).toEqual([
      expect.objectContaining({ codeRetrait: "K7P4QX", prescripteur: "Firmin Akpovi", delivrance: expect.objectContaining({ par: "Pharmacie Sainte-Rita" }) }),
    ]);
  });
});
