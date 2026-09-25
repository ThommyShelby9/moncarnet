import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes, patients, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { alertesOuvertes, consultationsDuJour, dossierPatient, patientsASurveiller, rechercherPatients } from "@/server/requetes/soignant";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;
let centre: string;
let autreCentre: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [firmin] = await db.select().from(comptes).where(eq(comptes.identifiant, "firmin.akpovi"));
  const [pharmacie] = await db.select().from(comptes).where(eq(comptes.identifiant, "pharmacie.sainte-rita"));
  centre = firmin!.etablissementId!;
  autreCentre = pharmacie!.etablissementId!;
});
afterAll(async () => fermer());

describe("alertesOuvertes", () => {
  it("montre le signalement d'Awa avec son terme, son numéro et l'échéance", async () => {
    await signalerDanger(db, {
      compteId: await idCompte(db, COMPTE.awa),
      patientId: await idPatient(db, "Awa"),
      evenementId: randomUUID(),
      signes: ["saignement"],
      maintenant: new Date("2026-09-25T08:41:00Z"),
    });
    const [alerte] = await alertesOuvertes(db, centre, aujourdhui);
    expect(alerte).toMatchObject({ prenom: "Awa", semainesGrossesse: 32, telephone: "+2290197000002", signes: ["saignement"] });
    expect(alerte?.echeance.toISOString()).toBe("2026-09-25T08:56:00.000Z");
    expect(await alertesOuvertes(db, autreCentre, aujourdhui)).toEqual([]);
  });
});

describe("consultationsDuJour", () => {
  it("range les rendez-vous du jour par plage, avec le risque et qui est déjà vu", async () => {
    const groupes = await consultationsDuJour(db, centre, aujourdhui);
    const lignes = groupes.flatMap((g) => g.lignes);
    const duJour = await db.select().from(rendezVous).where(and(eq(rendezVous.datePrevue, aujourdhui), isNull(rendezVous.annuleLe)));
    expect(lignes).toHaveLength(duJour.length);
    expect(lignes.some((l) => l.vu)).toBe(true);
    expect(lignes.some((l) => !l.vu)).toBe(true);
    expect(groupes[0]?.moment).toBe("matin");
    for (const g of groupes) if (g.capacite !== null) expect(g.lignes.length).toBeLessThanOrEqual(g.capacite);
  });
});

describe("patientsASurveiller", () => {
  it("fait remonter les patients à risque, le plus grave d'abord", async () => {
    const liste = await patientsASurveiller(db, centre, aujourdhui);
    expect(liste[0]).toMatchObject({ niveau: "eleve" });
    const rang = { eleve: 0, surveillance: 1, normal: 2 };
    expect(liste.map((p) => rang[p.niveau])).toEqual([...liste.map((p) => rang[p.niveau])].sort());
  });
});

describe("rechercherPatients", () => {
  it("trouve par le nom sans accent, par le téléphone, par le code du carnet", async () => {
    expect((await rechercherPatients(db, centre, "sena", aujourdhui)).map((p) => p.prenom)).toEqual(["Sèna"]);
    expect((await rechercherPatients(db, centre, "01 97 00 00 01", aujourdhui)).map((p) => p.prenom).sort()).toEqual(["Codjo", "Mariam", "Sèna"]);
    const [codjo] = await db.select().from(patients).where(eq(patients.prenom, "Codjo"));
    expect((await rechercherPatients(db, centre, codjo!.codeCourt.toLowerCase(), aujourdhui)).map((p) => p.prenom)).toEqual(["Codjo"]);
  });

  it("ne cherche que dans son centre", async () => {
    expect(await rechercherPatients(db, autreCentre, "sena", aujourdhui)).toEqual([]);
  });
});

describe("dossierPatient", () => {
  it("réunit l'identité, le risque, les étapes, les relevés et les ordonnances", async () => {
    const d = await dossierPatient(db, centre, await idPatient(db, "Codjo"), aujourdhui);
    expect(d?.patient).toMatchObject({ prenom: "Codjo", telephone: "+2290197000001", village: "Bohicon centre" });
    expect(d?.risque.global.niveau).toBe("surveillance");
    expect(d?.programmes[0]?.code).toBe("hypertension");
    expect(d?.mesures.length).toBeGreaterThanOrEqual(4);
    expect(d?.ordonnances).toEqual([expect.objectContaining({ codeRetrait: "K7P4QX" })]);
  });

  it("n'ouvre pas le dossier d'un patient d'un autre centre", async () => {
    expect(await dossierPatient(db, autreCentre, await idPatient(db, "Codjo"), aujourdhui)).toBeNull();
  });
});

describe("visites du relais", () => {
  it("montre dans le dossier les visites du relais, avec la note vocale à écouter", async () => {
    const d = await dossierPatient(db, centre, await idPatient(db, "Rachida"), aujourdhui);
    expect(d?.visites).toEqual([expect.objectContaining({ constat: "tout_va_bien", relais: "Koffi Agbessi", note: false, texte: null })]);
  });
});
