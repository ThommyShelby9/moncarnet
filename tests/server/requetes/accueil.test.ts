import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cartesDuJour } from "@/domain/cartes-du-jour";
import type { Db } from "@/server/db/client";
import { ordonnances } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { noterPrise } from "@/server/patient/prises";
import { donneesAccueil, prisesDuJour } from "@/server/requetes/accueil";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;
let famille: { codjo: string; mariam: string; sena: string };

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  famille = { codjo: await idPatient(db, "Codjo"), mariam: await idPatient(db, "Mariam"), sena: await idPatient(db, "Sèna") };
});
afterAll(async () => fermer());

describe("donneesAccueil", () => {
  it("réunit le traitement de Codjo et les rendez-vous de la famille", async () => {
    const d = await donneesAccueil(db, Object.values(famille), aujourdhui);
    expect(d.traitements).toEqual([expect.objectContaining({ patientId: famille.codjo, medicament: "Amlodipine 5 mg", indication: "la tension" })]);
    expect(d.rendezVous).toContainEqual(
      expect.objectContaining({ patientId: famille.sena, libelle: "Vaccins des 9 mois", datePrevue: "2026-09-27", reserve: false, faite: false }),
    );
    expect(d.rendezVous).toContainEqual(
      expect.objectContaining({ patientId: famille.codjo, libelle: "Contrôle de la tension", datePrevue: "2026-10-01", reserve: true }),
    );
  });

  it("donne à Codjo, le soir : son comprimé, la consultation de Mariam du jour, puis le vaccin de Sèna, puis son contrôle", async () => {
    const { pile, ensuite } = cartesDuJour({ aujourdhui, heure: 20, ...(await donneesAccueil(db, Object.values(famille), aujourdhui)) });
    expect(pile.map((c) => [c.type, c.patientId])).toEqual([
      ["prise", famille.codjo],
      ["rendez_vous", famille.mariam],
      ["rendez_vous", famille.sena],
      ["rendez_vous", famille.codjo],
    ]);
    expect(ensuite).toMatchObject({ type: "rendez_vous", patientId: famille.codjo });
  });

  it("compte une prise notée juste après minuit au Bénin pour le nouveau jour", async () => {
    const [ordonnance] = await db.select().from(ordonnances).where(eq(ordonnances.codeRetrait, "K7P4QX"));
    const prise = { compteId: await idCompte(db, COMPTE.codjo), patientId: famille.codjo, traitementCle: `${ordonnance!.id}:0`, moment: "soir" as const };
    await noterPrise(db, { ...prise, statut: "plus_tard", maintenant: new Date("2026-09-24T22:30:00Z") });
    await noterPrise(db, { ...prise, statut: "fait", maintenant: new Date("2026-09-24T23:30:00Z") });
    expect((await prisesDuJour(db, [famille.codjo], "2026-09-25")).map((p) => p.statut)).toEqual(["fait"]);
    expect((await prisesDuJour(db, [famille.codjo], "2026-09-24")).map((p) => p.statut)).toEqual(["plus_tard"]);
  });
});
