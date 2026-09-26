import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lireIndicateur } from "@/domain/pilotage";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

const aujourdhui = "2026-09-26";
const maintenant = new Date("2026-09-26T10:00:00Z");
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

describe("vueDeZone", () => {
  it("calcule en direct les indicateurs de la zone, commune par commune", async () => {
    const [zone] = await db.select().from(comptes).where(eq(comptes.identifiant, "zone.bohicon"));
    const vue = await vueDeZone(db, zone!.communeId!, aujourdhui, maintenant);
    expect(vue).toMatchObject({ zone: "Zogbodomey-Bohicon-Zakpota", departement: "Zou" });
    expect(vue!.communes.map((c) => c.nom)).toEqual(["Bohicon", "Zogbodomey"]);
    // Les 9 alertes passées de la démo ont toutes été prises en charge.
    expect(vue!.total.alertes_delai.denominateur).toBe(9);
    expect(lireIndicateur("alertes_delai", vue!.total.alertes_delai).niveau).toBe("bon");
    expect(vue!.total.alertes_15min).toEqual({ numerateur: 7, denominateur: 9 });
    expect(vue!.total.visites_relais.numerateur).toBeGreaterThanOrEqual(1);
    expect(vue!.total.cpn4.denominateur).toBeGreaterThanOrEqual(1);
    expect(vue!.total.hta_controles.denominateur).toBeGreaterThanOrEqual(5);
    // Chaque commune ne pèse qu'une partie de la zone.
    const somme = vue!.communes.reduce((s, c) => s + c.valeurs.alertes_delai.denominateur, 0);
    expect(somme).toBe(9);
    expect(vue!.tendance).toHaveLength(6);
    expect(vue!.tendance.at(-1)).toEqual({ mois: "2026-09-01", valeurs: vue!.total });
  });
});

describe("vueNationale", () => {
  it("réunit la zone de la démo (en direct) et les autres zones du pays", async () => {
    const vue = await vueNationale(db, aujourdhui, maintenant);
    expect(vue.mois).toBe("2026-09-01");
    expect(vue.zones).toHaveLength(11);
    expect(vue.zones.filter((z) => z.direct).map((z) => z.zone)).toEqual(["Zogbodomey-Bohicon-Zakpota"]);
    expect(vue.national.cpn4.denominateur).toBe(vue.zones.reduce((s, z) => s + z.valeurs.cpn4.denominateur, 0));
    expect(vue.tendance.map((t) => t.mois)).toEqual(["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"]);
  });
});

describe("alertes en direct", () => {
  it("compte les alertes qui attendent et celles en retard, sans aucun nom", async () => {
    const [zone] = await db.select().from(comptes).where(eq(comptes.identifiant, "zone.bohicon"));
    const rachida = await idPatient(db, "Rachida");
    await signalerDanger(db, { compteId: await idCompte(db, COMPTE.aicha), patientId: rachida, evenementId: randomUUID(), signes: ["fievre"], maintenant: new Date("2026-09-26T09:30:00Z") });
    const vue = await vueDeZone(db, zone!.communeId!, aujourdhui, maintenant);
    expect(vue!.alertes).toEqual({ enAttente: 1, enRetard: 1, plusAncienneMinutes: 30 });
  });
});
