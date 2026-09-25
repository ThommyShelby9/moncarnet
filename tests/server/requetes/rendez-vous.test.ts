import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { patients } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { inscrireListeAttente } from "@/server/patient/reservation";
import { listeAttenteDe, placesDisponibles, rendezVousVus } from "@/server/requetes/rendez-vous";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;
let etablissementId: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [codjo] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.prenom, "Codjo"));
  etablissementId = codjo!.etablissementId;
});
afterAll(async () => fermer());

describe("placesDisponibles", () => {
  it("compte les places prises sur chaque séance de vaccination", async () => {
    const seances = await placesDisponibles(db, { etablissementId, motif: "vaccin", du: "2026-09-26", au: "2026-10-16" });
    expect(seances.map((c) => c.date).sort()).toEqual(["2026-09-30", "2026-10-07", "2026-10-14"]);
    const mercredi = seances.find((c) => c.date === "2026-09-30")!;
    expect(mercredi.capacite - mercredi.reserves).toBe(3);
  });
});

describe("rendezVousVus", () => {
  it("nomme les rendez-vous d'après l'étape de leur programme", async () => {
    const [prochain] = await rendezVousVus(db, [await idPatient(db, "Sèna")], aujourdhui);
    expect(prochain).toMatchObject({ libelle: "Vaccins des 9 mois", etablissement: "Centre de santé de Bohicon", programme: true });
  });
});

describe("listeAttenteDe", () => {
  it("liste les demandes en attente de la famille", async () => {
    const complet = (await placesDisponibles(db, { etablissementId, motif: "consultation", du: "2026-09-26", au: "2026-10-16" })).find(
      (c) => c.reserves >= c.capacite,
    )!;
    const mariam = await idPatient(db, "Mariam");
    const r = await inscrireListeAttente(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: mariam, motif: "consultation", creneauId: complet.id });
    expect(r.ok).toBe(true);
    expect(await listeAttenteDe(db, [mariam, await idPatient(db, "Codjo")])).toEqual([
      expect.objectContaining({ patientId: mariam, motif: "consultation", dateSouhaitee: complet.date }),
    ]);
  });
});
