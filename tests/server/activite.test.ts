import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confierAuRelais, consignesDuCentre } from "@/server/consignes";
import type { Db } from "@/server/db/client";
import { comptes, evenements } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { alertesDuCentre, visitesDuCentre } from "@/server/soignant/activite";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

const aujourdhui = "2026-09-28";
const maintenant = new Date("2026-09-28T09:00:00Z");
const ilYa30Jours = new Date(maintenant.getTime() - 30 * 86_400_000);
let db: Db;
let fermer: () => Promise<void>;
let firmin: { id: string; etablissementId: string };

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [c] = await db.select().from(comptes).where(eq(comptes.identifiant, "firmin.akpovi"));
  firmin = { id: c!.id, etablissementId: c!.etablissementId! };
});
afterAll(async () => fermer());

describe("visites des relais du centre", () => {
  it("met les personnes à orienter d'abord, puis les visites les plus récentes", async () => {
    const visites = await visitesDuCentre(db, firmin.etablissementId, ilYa30Jours);
    expect(visites.length).toBeGreaterThanOrEqual(10);
    const orienter = visites.filter((v) => v.constat === "a_orienter");
    expect(orienter.length).toBeGreaterThanOrEqual(2);
    expect(visites.slice(0, orienter.length).every((v) => v.constat === "a_orienter")).toBe(true);
    const autres = visites.slice(orienter.length).map((v) => v.le.getTime());
    expect([...autres].sort((a, b) => b - a)).toEqual(autres);
    expect(visites.find((v) => v.prenom === "Rachida")).toMatchObject({ relais: "Koffi Agbessi", constat: "tout_va_bien", note: false });
    expect(orienter[0]!.texte).toEqual(expect.any(String));
  });

  it("ne montre rien d'un autre centre", async () => {
    expect(await visitesDuCentre(db, randomUUID(), ilYa30Jours)).toEqual([]);
  });
});

describe("consignes du centre", () => {
  it("dit si la consigne attend encore la visite du relais", async () => {
    const afiavi = await idPatient(db, "Afiavi", "Dossou");
    await confierAuRelais(db, { soignant: firmin, patientId: afiavi, texte: "Rappeler la CPN3", maintenant });
    const [avant] = await consignesDuCentre(db, firmin.etablissementId, ilYa30Jours);
    expect(avant).toMatchObject({ prenom: "Afiavi", texte: "Rappeler la CPN3", auteur: "Firmin Akpovi", faiteLe: null });
    const visiteLe = new Date(maintenant.getTime() + 3_600_000);
    await db.insert(evenements).values({ id: randomUUID(), patientId: afiavi, type: "visite_domicile", auteurId: await idCompte(db, "koffi.agbessi"), survenuLe: visiteLe, donnees: { constat: "tout_va_bien" } });
    const [apres] = await consignesDuCentre(db, firmin.etablissementId, ilYa30Jours);
    expect(apres!.faiteLe).toEqual(visiteLe);
  });
});

describe("alertes du centre", () => {
  it("donne l'historique avec le délai de prise en charge et le bilan", async () => {
    const { alertes, bilan } = await alertesDuCentre(db, firmin.etablissementId, ilYa30Jours, maintenant);
    expect(alertes).toHaveLength(9);
    expect(alertes.every((a) => a.statut === "prise" && a.delaiMinutes !== null && a.prisePar)).toBe(true);
    expect(alertes.map((a) => a.creeeLe.getTime())).toEqual([...alertes.map((a) => a.creeeLe.getTime())].sort((a, b) => b - a));
    // Délais de la démo : 4, 6, 7, 9, 11, 12, 14, 18 et 26 minutes.
    expect(bilan).toEqual({ total: 9, prises: 9, enCours: 0, enRetard: 0, delaiMoyen: 12, partSous15: 78 });
  });

  it("montre en tête les alertes en cours et en retard", async () => {
    const aicha = await idCompte(db, COMPTE.aicha);
    const rachida = await idPatient(db, "Rachida");
    await signalerDanger(db, { compteId: aicha, patientId: rachida, evenementId: randomUUID(), signes: ["fievre"], maintenant: new Date(maintenant.getTime() - 20 * 60_000) });
    const codjo = await idCompte(db, COMPTE.codjo);
    await signalerDanger(db, { compteId: codjo, patientId: await idPatient(db, "Mariam"), evenementId: randomUUID(), signes: ["douleur"], maintenant });
    const { alertes, bilan } = await alertesDuCentre(db, firmin.etablissementId, ilYa30Jours, maintenant);
    expect(alertes.slice(0, 2).map((a) => [a.prenom, a.statut])).toEqual([
      ["Rachida", "en_retard"],
      ["Mariam", "en_cours"],
    ]);
    expect(alertes[0]!.signes).toEqual(["fievre"]);
    expect(bilan).toMatchObject({ total: 11, enCours: 1, enRetard: 1 });
  });
});
