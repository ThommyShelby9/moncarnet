import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes, ordonnances } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { delivrancesDe, delivrer } from "@/server/pharmacie/delivrance";
import { finirRupture, rupturesDe, rupturesEnCours, signalerRupture } from "@/server/pharmacie/ruptures";
import { creerDbDeTest } from "../aides/base-de-test";

const aujourdhui = "2026-09-26";
const maintenant = new Date("2026-09-26T10:00:00Z");
const ilYa30Jours = new Date(maintenant.getTime() - 30 * 86_400_000);
let db: Db;
let fermer: () => Promise<void>;
let pharmacien: { id: string; etablissementId: string };

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [c] = await db.select().from(comptes).where(eq(comptes.identifiant, "pharmacie.sainte-rita"));
  pharmacien = { id: c!.id, etablissementId: c!.etablissementId! };
});
afterAll(async () => fermer());

describe("historique des délivrances", () => {
  it("liste les délivrances de la pharmacie, la plus récente d'abord, avec les seules initiales du patient", async () => {
    const [ordonnance] = await db.select().from(ordonnances).where(eq(ordonnances.codeRetrait, "M4R2TN"));
    await delivrer(db, { auteurId: pharmacien.id, ordonnanceId: ordonnance!.id, maintenant });
    const liste = await delivrancesDe(db, pharmacien.etablissementId, ilYa30Jours);
    expect(liste.length).toBeGreaterThanOrEqual(5);
    expect(liste[0]).toEqual({ id: expect.any(String), le: maintenant, code: "M4R2TN", medicaments: ["Paracétamol 500 mg"], patient: "M. H.", par: "Pharmacie Sainte-Rita" });
    expect(liste.every((d) => /^[A-ZÀ-Ý]\. [A-ZÀ-Ý]\.$/.test(d.patient))).toBe(true);
    expect(liste.map((d) => d.le.getTime())).toEqual([...liste.map((d) => d.le.getTime())].sort((a, b) => b - a));
    expect(JSON.stringify(liste)).not.toMatch(/Mariam|Houngbo/);
  });

  it("ne montre rien à une autre pharmacie", async () => {
    expect(await delivrancesDe(db, randomUUID(), ilYa30Jours)).toEqual([]);
  });
});

describe("ruptures de stock", () => {
  it("montre la rupture de la démo aux soignants", async () => {
    expect(await rupturesEnCours(db)).toEqual([expect.objectContaining({ medicament: "Fer + acide folique", pharmacie: "Pharmacie Sainte-Rita" })]);
  });

  it("signale une rupture une seule fois, puis la termine", async () => {
    const r = await signalerRupture(db, { compte: pharmacien, medicament: "  Amoxicilline   500 mg ", maintenant });
    expect(r).toEqual({ ok: true, donnees: { ruptureId: expect.any(String) } });
    expect(await signalerRupture(db, { compte: pharmacien, medicament: "amoxicilline 500 MG", maintenant })).toEqual({ ok: false, erreur: "deja_signalee" });
    expect((await rupturesEnCours(db)).map((x) => x.medicament)).toContain("Amoxicilline 500 mg");
    const id = r.ok ? r.donnees.ruptureId : "";
    expect(await finirRupture(db, { compte: { id: pharmacien.id, etablissementId: randomUUID() }, ruptureId: id, maintenant })).toEqual({ ok: false, erreur: "introuvable" });
    expect(await finirRupture(db, { compte: pharmacien, ruptureId: id, maintenant })).toEqual({ ok: true, donnees: null });
    expect((await rupturesEnCours(db)).map((x) => x.medicament)).not.toContain("Amoxicilline 500 mg");
    const { enCours, finies } = await rupturesDe(db, pharmacien.etablissementId, ilYa30Jours);
    expect(enCours.map((x) => x.medicament)).toEqual(["Fer + acide folique"]);
    expect(finies[0]).toMatchObject({ medicament: "Amoxicilline 500 mg", finieLe: maintenant });
  });

  it("refuse un nom de médicament vide ou trop long", async () => {
    expect(await signalerRupture(db, { compte: pharmacien, medicament: " a ", maintenant })).toEqual({ ok: false, erreur: "invalide" });
    expect(await signalerRupture(db, { compte: pharmacien, medicament: "x".repeat(81), maintenant })).toEqual({ ok: false, erreur: "invalide" });
  });
});
