import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { evenements, patients } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { mesuresDes, risquesDes } from "@/server/requetes/risques";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

async function patient(prenom: string) {
  const [p] = await db.select().from(patients).where(eq(patients.id, await idPatient(db, prenom)));
  return p!;
}

describe("mesuresDes", () => {
  it("réunit les tensions des consultations et des relevés, dans l'ordre des dates", async () => {
    const codjo = await patient("Codjo");
    const mesures = (await mesuresDes(db, [codjo.id])).get(codjo.id) ?? [];
    expect(mesures.length).toBeGreaterThanOrEqual(4);
    expect(mesures.map((m) => m.date)).toEqual([...mesures.map((m) => m.date)].sort());
    expect(mesures.at(-1)).toMatchObject({ tensionSys: 145, tensionDia: 92, source: "mesure" });
  });
});

describe("risquesDes", () => {
  it("met Codjo « à surveiller » : deux tensions de suite au-dessus de 140/90", async () => {
    const codjo = await patient("Codjo");
    const risque = (await risquesDes(db, [codjo], aujourdhui)).get(codjo.id);
    expect(risque?.global.niveau).toBe("surveillance");
    expect(risque?.global.motifs).toEqual(["Tension non contrôlée (148/94 puis 145/92)"]);
  });

  it("passe Codjo en risque élevé après une tension à 180/110", async () => {
    const codjo = await patient("Codjo");
    await db.insert(evenements).values({
      id: randomUUID(),
      patientId: codjo.id,
      type: "consultation",
      survenuLe: new Date("2026-09-25T09:00:00Z"),
      donnees: { motif: "tension", mesures: { tensionSys: 180, tensionDia: 110 } },
    });
    const risque = (await risquesDes(db, [codjo], aujourdhui)).get(codjo.id);
    expect(risque?.global).toEqual({ niveau: "eleve", motifs: ["Tension très élevée (180/110)"] });
  });

  it("passe Awa en risque élevé tant que son signe de danger n'est pas pris en charge", async () => {
    const awa = await patient("Awa");
    expect((await risquesDes(db, [awa], aujourdhui)).get(awa.id)?.global.niveau).toBe("normal");
    await signalerDanger(db, { compteId: await idCompte(db, COMPTE.awa), patientId: awa.id, evenementId: randomUUID(), signes: ["saignement"] });
    const risque = (await risquesDes(db, [awa], aujourdhui)).get(awa.id);
    expect(risque?.global).toMatchObject({ niveau: "eleve", motifs: ["Signe de danger non pris en charge"] });
    expect(risque?.programmes.map((p) => p.code)).toEqual(["grossesse"]);
  });
});
