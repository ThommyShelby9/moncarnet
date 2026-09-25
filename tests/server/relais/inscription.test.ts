import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { InscriptionDonnees } from "@/domain/evenements";
import { uuidV7 } from "@/domain/identifiants";
import type { Db } from "@/server/db/client";
import { evenements, foyers, inscriptions, patients, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { foyerDuRelais, patientDuRelais } from "@/server/droits";
import { inscrirePersonne } from "@/server/relais/inscription";
import { creerDbDeTest } from "../../aides/base-de-test";
import { idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
const survenuLe = new Date("2026-09-25T09:00:00Z");
let db: Db;
let fermer: () => Promise<void>;
let koffi: string;
let foyerDossou: string;
let foyerHoungbo: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  koffi = await idCompte(db, "koffi.agbessi");
  const idFoyer = async (nom: string) => (await db.select({ id: foyers.id }).from(foyers).where(eq(foyers.nom, nom)))[0]!.id;
  foyerDossou = await idFoyer("Dossou");
  foyerHoungbo = await idFoyer("Houngbo");
});
afterAll(async () => fermer());

describe("droits du relais", () => {
  it("ne donne au relais que les personnes et les foyers de sa tournée", async () => {
    expect(await patientDuRelais(db, koffi, await idPatient(db, "Afiavi", "Dossou"))).toBe(true);
    expect(await patientDuRelais(db, koffi, await idPatient(db, "Codjo"))).toBe(false);
    expect(await patientDuRelais(db, koffi, "pas-un-identifiant")).toBe(false);
    expect(await foyerDuRelais(db, koffi, foyerDossou)).toBe(true);
    expect(await foyerDuRelais(db, koffi, foyerHoungbo)).toBe(false);
  });
});

describe("inscrirePersonne", () => {
  const yao = (foyerId: string): InscriptionDonnees => ({
    foyerId,
    prenom: "Yao",
    nom: "Dossou",
    sexe: "M",
    dateNaissance: "2026-09-20",
    telephone: "+2290197000003",
    programme: { code: "vaccination", dateReference: "2026-09-20" },
  });

  it("crée le carnet avec l'identifiant du téléphone, le suivi et ses rendez-vous", async () => {
    const patientId = uuidV7();
    const evenementId = uuidV7();
    expect(await inscrirePersonne(db, { relaisId: koffi, patientId, evenementId, donnees: yao(foyerDossou), survenuLe, aujourdhui })).toEqual({
      ok: true,
      donnees: "accepte",
    });
    const [personne] = await db.select().from(patients).where(eq(patients.id, patientId));
    expect(personne).toMatchObject({ prenom: "Yao", foyerId: foyerDossou, dateNaissance: "2026-09-20", canalPrefere: "sms" });
    expect(personne!.codeCourt).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(await db.select().from(inscriptions).where(eq(inscriptions.patientId, patientId))).toEqual([
      expect.objectContaining({ programme: "vaccination", dateReference: "2026-09-20", dateInscription: aujourdhui }),
    ]);
    const rdvs = await db.select().from(rendezVous).where(eq(rendezVous.patientId, patientId));
    expect(rdvs.length).toBeGreaterThan(0);
    expect(rdvs.every((r) => r.motif === "vaccin" && r.source === "relais" && r.creneauId === null)).toBe(true);
    expect(await db.select().from(evenements).where(eq(evenements.id, evenementId))).toEqual([
      expect.objectContaining({ type: "inscription", patientId, auteurId: koffi }),
    ]);
    expect(await patientDuRelais(db, koffi, patientId)).toBe(true);
  });

  it("reconnaît une inscription déjà reçue", async () => {
    const kossi: InscriptionDonnees = { foyerId: foyerDossou, prenom: "Kossi", nom: "Dossou", sexe: "M", dateNaissance: "1990-05-01" };
    const e = { relaisId: koffi, patientId: uuidV7(), evenementId: uuidV7(), donnees: kossi, survenuLe, aujourdhui };
    expect(await inscrirePersonne(db, e)).toEqual({ ok: true, donnees: "accepte" });
    expect(await inscrirePersonne(db, e)).toEqual({ ok: true, donnees: "deja_recu" });
    // Sans téléphone, les rappels passent par le relais.
    expect(await db.select().from(patients).where(eq(patients.prenom, "Kossi"))).toEqual([expect.objectContaining({ canalPrefere: "relais" })]);
  });

  it("refuse un foyer qui n'est pas dans sa tournée", async () => {
    expect(
      await inscrirePersonne(db, { relaisId: koffi, patientId: uuidV7(), evenementId: uuidV7(), donnees: yao(foyerHoungbo), survenuLe, aujourdhui }),
    ).toEqual({ ok: false, erreur: "foyer_hors_tournee" });
  });
});
