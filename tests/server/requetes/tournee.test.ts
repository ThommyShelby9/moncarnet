import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { tourneeDuRelais } from "@/server/requetes/tournee";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;
let koffi: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  koffi = await idCompte(db, "koffi.agbessi");
});
afterAll(async () => fermer());

describe("tourneeDuRelais", () => {
  it("donne les foyers de Koffi avec les raisons d'y passer", async () => {
    const tournee = await tourneeDuRelais(db, koffi, "Koffi Agbessi", aujourdhui, new Date("2026-09-25T07:00:00Z"));
    expect(tournee).toMatchObject({ relais: "Koffi Agbessi", aujourdhui, prepareeLe: "2026-09-25T07:00:00.000Z" });
    const noms = tournee.foyers.map((f) => f.nom);
    expect(noms).toEqual(expect.arrayContaining(["Dossou", "Salifou"]));
    expect(noms).not.toContain("Houngbo");
    const afiavi = tournee.foyers.find((f) => f.nom === "Dossou")?.personnes.find((p) => p.prenom === "Afiavi");
    expect(afiavi).toMatchObject({ enceinte: true, malvoyant: false, vueAujourdhui: false, telephone: "+2290197000003" });
    expect(afiavi?.raisons).toContainEqual({ texte: "Consultation prénatale 2 manquée", urgence: 1 });
    // La visite de la démo chez Rachida date de 3 jours : elle ne compte pas pour aujourd'hui.
    const rachida = tournee.foyers.find((f) => f.nom === "Salifou")?.personnes.find((p) => p.prenom === "Rachida");
    expect(rachida).toMatchObject({ malvoyant: true, vueAujourdhui: false });
  });

  it("met en tête le foyer d'une personne qui a signalé un danger", async () => {
    await signalerDanger(db, { compteId: await idCompte(db, COMPTE.aicha), patientId: await idPatient(db, "Rachida"), evenementId: randomUUID(), signes: ["fievre"] });
    const tournee = await tourneeDuRelais(db, koffi, "Koffi Agbessi", aujourdhui, new Date());
    expect(tournee.foyers[0]).toMatchObject({ nom: "Salifou", urgence: 0 });
    expect(tournee.foyers[0]?.personnes.find((p) => p.prenom === "Rachida")?.raisons[0]?.urgence).toBe(0);
  });
});
