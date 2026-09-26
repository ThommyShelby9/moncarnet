import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes, evenements, inscriptions, patients, responsables } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { enregistrerPlanNaissance } from "@/server/patient/plan-naissance";
import { carnetsDuCompte } from "@/server/requetes/carnets";
import { grossesseDe, naissancesRecentes, planNaissanceDe } from "@/server/requetes/grossesse";
import { tensionsDe } from "@/server/requetes/risques";
import { dossierPatient } from "@/server/requetes/soignant";
import { declarerNaissance } from "@/server/soignant/naissance";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

const aujourdhui = "2026-09-26";
let db: Db;
let fermer: () => Promise<void>;
let adjoa: { id: string; etablissementId: string | null };
let awa: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [compte] = await db.select().from(comptes).where(eq(comptes.identifiant, "adjoa.gbaguidi"));
  adjoa = { id: compte!.id, etablissementId: compte!.etablissementId };
  awa = await idPatient(db, "Awa");
});
afterAll(async () => fermer());

const saisie = { le: new Date("2026-09-26T05:40:00Z"), lieu: "centre", mode: "voie_basse", sexe: "F", prenom: null, poidsGrammes: 3200, vaccinsNaissance: true } as const;

describe("plan de naissance", () => {
  it("garde ce qu'Awa a déjà préparé, et seulement pour les carnets qu'elle gère", async () => {
    expect(await grossesseDe(db, awa)).toMatchObject({ ddr: expect.any(String) });
    const compteAwa = await idCompte(db, COMPTE.awa);
    expect(await enregistrerPlanNaissance(db, { compteId: compteAwa, patientId: awa, elements: ["lieu", "transport", "sac"] })).toEqual({ ok: true, donnees: null });
    expect(await planNaissanceDe(db, awa)).toEqual(["lieu", "transport", "sac"]);
    expect(await enregistrerPlanNaissance(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: awa, elements: [] })).toEqual({ ok: false, erreur: "interdit" });
  });
});

describe("declarerNaissance", () => {
  it("refuse un soignant d'un autre centre", async () => {
    expect(await declarerNaissance(db, { auteur: { id: adjoa.id, etablissementId: null }, mereId: awa, saisie })).toEqual({ ok: false, erreur: "interdit" });
  });

  it("crée le carnet du bébé, rattaché à la mère et à sa famille, avec ses vaccins de naissance", async () => {
    const r = await declarerNaissance(db, { auteur: adjoa, mereId: awa, saisie });
    expect(r.ok).toBe(true);
    const bebeId = r.ok ? r.donnees.bebeId : "";
    const [bebe] = await db.select().from(patients).where(eq(patients.id, bebeId));
    expect(bebe).toMatchObject({ prenom: "Bébé", nom: "Hounkpatin", sexe: "F", dateNaissance: "2026-09-26", mereId: awa });
    // Le compte d'Awa gère maintenant le carnet de son bébé.
    const carnets = await carnetsDuCompte(db, await idCompte(db, COMPTE.awa), aujourdhui);
    expect(carnets.find((c) => c.patientId === bebeId)).toMatchObject({ lien: "parent", programmes: ["vaccination"] });
    const vaccins = await db.select().from(evenements).where(and(eq(evenements.patientId, bebeId), eq(evenements.type, "vaccination")));
    expect(vaccins).toEqual([expect.objectContaining({ donnees: { etape: "naissance", vaccins: ["BCG", "VPO0"] } })]);
    // La grossesse est close ; le suivi après l'accouchement commence.
    const suivis = await db.select().from(inscriptions).where(eq(inscriptions.patientId, awa));
    expect(suivis.find((i) => i.programme === "grossesse")?.active).toBe(false);
    expect(suivis.find((i) => i.programme === "postnatal")).toMatchObject({ active: true, dateReference: "2026-09-26" });
    expect(await naissancesRecentes(db, [awa], new Date("2026-09-20T00:00:00Z"))).toEqual([
      { mereId: awa, bebeId, prenom: "Bébé", sexe: "F", le: saisie.le },
    ]);
    const dossierBebe = await dossierPatient(db, adjoa.etablissementId!, bebeId, aujourdhui);
    expect(dossierBebe?.mere).toMatchObject({ id: awa, prenom: "Awa" });
    expect((await dossierPatient(db, adjoa.etablissementId!, awa, aujourdhui))?.enfants).toEqual([expect.objectContaining({ id: bebeId, prenom: "Bébé" })]);
  });

  it("ne déclare la naissance qu'une fois", async () => {
    expect(await declarerNaissance(db, { auteur: adjoa, mereId: awa, saisie })).toEqual({ ok: false, erreur: "pas_de_grossesse" });
    const bebes = await db.select().from(patients).where(eq(patients.mereId, awa));
    expect(bebes).toHaveLength(1);
    expect(await db.select().from(responsables).where(eq(responsables.patientId, bebes[0]!.id))).toHaveLength(1);
  });
});

describe("tensionsDe", () => {
  it("donne les relevés de tension de Codjo, du plus ancien au plus récent", async () => {
    const tensions = await tensionsDe(db, await idPatient(db, "Codjo"));
    expect(tensions.length).toBeGreaterThanOrEqual(3);
    expect(tensions.at(-1)).toMatchObject({ sys: 145, dia: 92 });
    expect(tensions.map((t) => t.date)).toEqual([...tensions.map((t) => t.date)].sort());
  });
});
