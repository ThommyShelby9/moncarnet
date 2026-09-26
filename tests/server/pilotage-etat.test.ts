import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { alertesParSemaine, centresDeLaZone, vueDUneZone } from "@/server/requetes/pilotage-etat";
import { vueNationale } from "@/server/requetes/pilotage";
import { creerDbDeTest } from "../aides/base-de-test";

const aujourdhui = "2026-09-26";
const maintenant = new Date("2026-09-26T10:00:00Z");
const ZONE = "Zogbodomey-Bohicon-Zakpota";
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

describe("fiche d'une zone", () => {
  it("calcule la zone de la démo en direct, commune par commune", async () => {
    const fiche = await vueDUneZone(db, ZONE, aujourdhui, maintenant);
    expect(fiche).toMatchObject({ zone: ZONE, departement: "Zou", direct: true });
    expect(fiche!.communes.map((c) => c.nom)).toEqual(["Bohicon", "Zogbodomey"]);
    expect(fiche!.tendance).toHaveLength(6);
    expect(fiche!.alertes).not.toBeNull();
  });

  it("lit une zone fictive dans l'historique, sans communes ni alertes en direct", async () => {
    const nationale = await vueNationale(db, aujourdhui, maintenant);
    const fictive = nationale.zones.find((z) => !z.direct)!;
    const fiche = await vueDUneZone(db, fictive.zone, aujourdhui, maintenant);
    expect(fiche).toMatchObject({ zone: fictive.zone, departement: fictive.departement, direct: false, communes: [], alertes: null });
    expect(fiche!.valeurs).toEqual(fictive.valeurs);
    expect(fiche!.tendance).toHaveLength(6);
    expect(fiche!.tendance.at(-1)!.valeurs).toEqual(fictive.valeurs);
  });

  it("ne connaît pas une zone inventée", async () => {
    expect(await vueDUneZone(db, "Zone qui n'existe pas", aujourdhui, maintenant)).toBeNull();
  });
});

describe("centres et relais de la zone", () => {
  it("compte l'activité de chaque centre, sans aucun nom de patient", async () => {
    const { centres } = await centresDeLaZone(db, ZONE, aujourdhui, maintenant);
    expect(centres).toHaveLength(1);
    const [centre] = centres;
    expect(centre).toMatchObject({ nom: "Centre de santé de Bohicon", commune: "Bohicon" });
    expect(centre!.consultations).toBeGreaterThan(0);
    expect(centre!.alertes).toEqual({ total: 9, delaiMoyen: 12, partSous15: 78 });
    expect(centre!.attenteMoyenne).toEqual(expect.any(Number));
    expect(centre!.remplissage.capacite).toBeGreaterThan(centre!.remplissage.prises);
    expect(JSON.stringify(centres)).not.toMatch(/Houngbo|Dossou|Salifou/);
  });

  it("compte les foyers et les visites de chaque relais", async () => {
    const { relais } = await centresDeLaZone(db, ZONE, aujourdhui, maintenant);
    expect(relais).toEqual([
      expect.objectContaining({ nom: "Koffi Agbessi", visites: expect.any(Number), aOrienter: 3, foyers: expect.any(Number), foyersVisites: expect.any(Number) }),
    ]);
    const [koffi] = relais;
    expect(koffi!.visites).toBeGreaterThanOrEqual(10);
    expect(koffi!.foyersVisites).toBeLessThanOrEqual(koffi!.foyers);
    expect(koffi!.foyers).toBeGreaterThanOrEqual(3);
  });

  it("ne donne rien pour une zone sans centre", async () => {
    expect(await centresDeLaZone(db, "Zone qui n'existe pas", aujourdhui, maintenant)).toEqual({ centres: [], relais: [] });
  });
});

describe("alertes semaine par semaine", () => {
  it("range les alertes des 8 dernières semaines, du lundi au dimanche", async () => {
    const semaines = await alertesParSemaine(db, ZONE, aujourdhui, 8);
    expect(semaines).toHaveLength(8);
    expect(semaines.at(-1)!.debut).toBe("2026-09-21");
    expect(semaines[0]!.debut).toBe("2026-08-03");
    expect(semaines.reduce((s, x) => s + x.total, 0)).toBe(9);
    expect(semaines.reduce((s, x) => s + x.sous15, 0)).toBe(7);
    expect(semaines.reduce((s, x) => s + x.prises, 0)).toBe(9);
  });
});
