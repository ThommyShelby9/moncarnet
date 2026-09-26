import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { programmesDuCarnet } from "@/server/requetes/carnet";
import { contenuPour } from "@/server/contenus";
import { creerDbDeTest } from "../../aides/base-de-test";
import { idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

describe("programmesDuCarnet", () => {
  it("montre les vaccins faits de Sèna avec leur lieu, puis les suivants", async () => {
    const [vaccination] = await programmesDuCarnet(db, await idPatient(db, "Sèna"), aujourdhui);
    expect(vaccination?.code).toBe("vaccination");
    expect(vaccination?.etapes.map((e) => e.statut)).toEqual(["faite", "faite", "faite", "faite", "a_venir", "a_venir"]);
    expect(vaccination?.etapes[0]?.faite?.lieu).toBe("Centre de santé de Bohicon");
    expect(vaccination?.etapes[4]).toMatchObject({ code: "9mois", motif: "vaccin", reservation: null, datePrevue: "2026-09-27" });
  });

  it("montre la place réservée du prochain contrôle de Codjo", async () => {
    const [tension] = await programmesDuCarnet(db, await idPatient(db, "Codjo"), aujourdhui);
    const prochain = tension?.etapes.find((e) => e.statut === "a_venir");
    expect(prochain).toMatchObject({ libelle: "Contrôle de la tension", reservation: { date: "2026-10-01", moment: "matin" } });
  });
});

describe("contenuPour", () => {
  it("donne le texte d'un contenu en français", async () => {
    expect((await contenuPour(db, "danger_conseil", "fr"))?.texte).toBe("Allez au centre de santé maintenant ou appelez-le. N'attendez pas.");
    expect(await contenuPour(db, "inconnu", "fr")).toBeNull();
  });
});
