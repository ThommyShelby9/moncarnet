import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { appelerSuivant, arriverAuCentre, peuventArriver, placesDuJour, salleAttente } from "@/server/salle-attente";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

const aujourdhui = "2026-09-26";
const maintenant = new Date("2026-09-26T09:30:00Z");
let db: Db;
let fermer: () => Promise<void>;
let firmin: { id: string; etablissementId: string | null };

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [c] = await db.select().from(comptes).where(eq(comptes.identifiant, "firmin.akpovi"));
  firmin = { id: c!.id, etablissementId: c!.etablissementId };
});
afterAll(async () => fermer());

describe("salle d'attente", () => {
  it("propose « Je suis arrivé » à qui a rendez-vous aujourd'hui ou une alerte du jour", async () => {
    const mariam = await idPatient(db, "Mariam");
    const codjo = await idPatient(db, "Codjo");
    const possibles = await peuventArriver(db, [mariam, codjo], aujourdhui);
    expect([...possibles]).toEqual([mariam]);
  });

  it("donne un numéro à qui arrive, le même s'il touche deux fois", async () => {
    const codjo = await idCompte(db, COMPTE.codjo);
    const mariam = await idPatient(db, "Mariam");
    const avant = (await salleAttente(db, firmin.etablissementId!, aujourdhui)).length;
    const r = await arriverAuCentre(db, { compteId: codjo, patientId: mariam, maintenant });
    expect(r.ok).toBe(true);
    expect(await arriverAuCentre(db, { compteId: codjo, patientId: mariam, maintenant })).toEqual(r);
    const salle = await salleAttente(db, firmin.etablissementId!, aujourdhui);
    expect(salle).toHaveLength(avant + 1);
    expect(salle.at(-1)).toMatchObject({ prenom: "Mariam", urgent: false });
    const place = (await placesDuJour(db, [mariam], aujourdhui)).get(mariam);
    expect(place).toMatchObject({ etat: "attente", avant });
  });

  it("refuse un compte qui ne gère pas ce carnet", async () => {
    expect(await arriverAuCentre(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Mariam"), maintenant })).toEqual({ ok: false, erreur: "interdit" });
  });

  it("fait passer devant une personne qui a signalé un danger", async () => {
    const aicha = await idCompte(db, COMPTE.aicha);
    const rachida = await idPatient(db, "Rachida");
    await signalerDanger(db, { compteId: aicha, patientId: rachida, evenementId: randomUUID(), signes: ["fievre"], maintenant });
    await arriverAuCentre(db, { compteId: aicha, patientId: rachida, maintenant });
    expect((await salleAttente(db, firmin.etablissementId!, aujourdhui))[0]).toMatchObject({ prenom: "Rachida", urgent: true });
    expect(await appelerSuivant(db, { soignant: firmin, maintenant })).toEqual({ ok: true, donnees: { patientId: rachida, numero: expect.any(Number), prenom: "Rachida" } });
    expect((await placesDuJour(db, [rachida], aujourdhui)).get(rachida)).toMatchObject({ etat: "appele" });
  });
});
