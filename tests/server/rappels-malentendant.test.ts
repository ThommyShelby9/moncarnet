import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { contacts, patients, rappels, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { envoyerRappels, relancer } from "@/server/rappels";
import { creerDbDeTest } from "../aides/base-de-test";

// Un lundi : J+2 tombe un mercredi, jour de plages.
const aujourdhui = "2026-09-28";
const maintenant = new Date("2026-09-28T08:00:00Z");
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

describe("rappels d'une personne malentendante", () => {
  it("ne l'appelle jamais, même si elle a choisi la voix : un SMS, puis le relais", async () => {
    const [place] = await db
      .select({ rendezVousId: rendezVous.id, patientId: rendezVous.patientId })
      .from(rendezVous)
      .innerJoin(contacts, eq(contacts.patientId, rendezVous.patientId))
      .where(and(eq(rendezVous.datePrevue, "2026-09-30"), isNotNull(rendezVous.creneauId), isNull(rendezVous.annuleLe), isNotNull(contacts.telephone)))
      .limit(1);
    await db.update(patients).set({ malentendant: true, canalPrefere: "vocal" }).where(eq(patients.id, place!.patientId));

    await envoyerRappels(db, { maintenant, aujourdhui });
    const canaux = async () =>
      (await db.select({ canal: rappels.canal }).from(rappels).where(eq(rappels.rendezVousId, place!.rendezVousId))).map((r) => r.canal).sort();
    expect(await canaux()).toEqual(["sms"]);

    await relancer(db, { maintenant: new Date(maintenant.getTime() + 3 * 3_600_000), delaiMinutes: 0 });
    expect(await canaux()).toEqual(["relais", "sms"]);
  });
});
