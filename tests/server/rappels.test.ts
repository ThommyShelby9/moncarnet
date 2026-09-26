import { and, eq, isNotNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes, rappels, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { envoyerRappels, messagesDuTelephone, rappelEnAttente, relancer, repondreRappel } from "@/server/rappels";
import { tourneeDuRelais } from "@/server/requetes/tournee";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

// Un lundi : J+2 tombe un mercredi, jour de plages (le vendredi, J+2 serait un dimanche sans aucune place).
const aujourdhui = "2026-09-28";
const maintenant = new Date("2026-09-28T08:00:00Z");
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

describe("rappels", () => {
  it("envoie un rappel à J-2 pour chaque place réservée, sans doublon", async () => {
    const premier = await envoyerRappels(db, { maintenant, aujourdhui });
    expect(premier.envoyes).toBeGreaterThan(0);
    expect(await envoyerRappels(db, { maintenant, aujourdhui })).toEqual({ envoyes: 0 });
    const envoyes = await db.select().from(rappels).where(eq(rappels.envoyeLe, maintenant));
    expect(envoyes.every((r) => !/tension|diabète|grossesse/i.test(r.contenu))).toBe(true);
  });

  it("« Je ne peux pas » libère la place ; une seconde réponse ne change rien", async () => {
    const codjo = await idPatient(db, "Codjo");
    const enAttente = await rappelEnAttente(db, [codjo]);
    expect(enAttente).toMatchObject({ patientId: codjo, canal: "whatsapp" });
    const compte = await idCompte(db, COMPTE.codjo);
    expect(await repondreRappel(db, { rappelId: enAttente!.rappelId, reponse: "empeche", maintenant, compteId: compte })).toMatchObject({ ok: true });
    const [rdv] = await db.select().from(rendezVous).where(eq(rendezVous.id, enAttente!.rendezVousId));
    expect(rdv?.annuleLe).toEqual(maintenant);
    expect(await repondreRappel(db, { rappelId: enAttente!.rappelId, reponse: "viendra", maintenant, compteId: compte })).toEqual({ ok: false, erreur: "deja_repondu" });
    expect(await rappelEnAttente(db, [codjo])).toBeNull();
  });

  it("relance sans réponse sur le canal suivant, jusqu'au relais", async () => {
    const plusTard = new Date(maintenant.getTime() + 3 * 3_600_000);
    const { relances } = await relancer(db, { maintenant: plusTard, delaiMinutes: 120 });
    expect(relances).toBeGreaterThan(0);
    const sansReponse = await db.select().from(rappels).where(eq(rappels.statut, "sans_reponse"));
    expect(sansReponse.length).toBeGreaterThanOrEqual(relances);
  });

  it("met dans la tournée du relais Afiavi, que ni le SMS ni l'appel n'ont jointe", async () => {
    const tournee = await tourneeDuRelais(db, await idCompte(db, "koffi.agbessi"), "Koffi Agbessi", aujourdhui, maintenant);
    const afiavi = tournee.foyers.find((f) => f.nom === "Dossou")?.personnes.find((p) => p.prenom === "Afiavi");
    expect(afiavi?.raisons).toContainEqual({ texte: "Rappels sans réponse (SMS, appel) : prévenir de vive voix", urgence: 1 });
    const messages = await messagesDuTelephone(db, "+2290197000003");
    expect(messages.map((m) => m.canal)).toEqual(["vocal", "sms"]);
  });

  it("refuse la réponse d'un compte qui ne gère pas ce carnet", async () => {
    const [unRappel] = await db.select().from(rappels).where(and(eq(rappels.canal, "sms"), isNotNull(rappels.telephone)));
    const [awa] = await db.select().from(comptes).where(eq(comptes.identifiant, COMPTE.awa));
    expect(await repondreRappel(db, { rappelId: unRappel!.id, reponse: "viendra", maintenant, compteId: awa!.id })).toEqual({ ok: false, erreur: "interdit" });
  });
});
