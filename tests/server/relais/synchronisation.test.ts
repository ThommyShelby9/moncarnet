import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { uuidV7 } from "@/domain/identifiants";
import type { Db } from "@/server/db/client";
import { alertes, evenements, foyers } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { MOTIFS_REFUS, synchroniser } from "@/server/relais/synchronisation";
import { tourneeDuRelais } from "@/server/requetes/tournee";
import { creerDbDeTest } from "../../aides/base-de-test";
import { idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
const maintenant = new Date("2026-09-25T10:00:00Z");
let db: Db;
let fermer: () => Promise<void>;
let koffi: string;
let afiavi: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  koffi = await idCompte(db, "koffi.agbessi");
  afiavi = await idPatient(db, "Afiavi", "Dossou");
});
afterAll(async () => fermer());

const saisie = (patientId: string, type: string, donnees: Record<string, unknown>, survenuLe = "2026-09-25T09:30:00.000Z") => ({
  id: uuidV7(),
  patientId,
  type,
  survenuLe,
  donnees,
});
const envoyer = (lot: unknown[]) => synchroniser(db, { relaisId: koffi, lot, maintenant, aujourdhui });

describe("synchroniser", () => {
  it("enregistre une visite, puis la reconnaît quand elle revient après une coupure", async () => {
    const visite = saisie(afiavi, "visite_domicile", { constat: "a_orienter", noteVocale: true, texte: "Très fatiguée" });
    expect(await envoyer([visite])).toEqual([{ id: visite.id, statut: "accepte" }]);
    expect(await envoyer([visite])).toEqual([{ id: visite.id, statut: "deja_recu" }]);
    expect(await db.select().from(evenements).where(eq(evenements.id, visite.id))).toEqual([
      expect.objectContaining({
        auteurId: koffi,
        survenuLe: new Date("2026-09-25T09:30:00.000Z"),
        donnees: { constat: "a_orienter", noteVocale: true, texte: "Très fatiguée" },
      }),
    ]);
  });

  it("refuse avec la raison : hors tournée, horloge fausse, incomplète, non permise ou illisible", async () => {
    const resultats = await envoyer([
      saisie(await idPatient(db, "Codjo"), "visite_domicile", { constat: "tout_va_bien" }),
      saisie(afiavi, "visite_domicile", { constat: "tout_va_bien" }, "2026-10-02T09:00:00.000Z"),
      saisie(afiavi, "visite_domicile", { constat: "peut-etre" }),
      saisie(afiavi, "prise_medicament", { traitement: "Fer", moment: "soir", statut: "fait" }),
      { id: "pas-un-identifiant" },
    ]);
    expect(resultats.map((r) => r.statut)).toEqual(["refuse", "refuse", "refuse", "refuse", "refuse"]);
    expect(resultats.map((r) => r.motif)).toEqual([
      MOTIFS_REFUS.hors_tournee,
      MOTIFS_REFUS.date,
      MOTIFS_REFUS.incomplete,
      MOTIFS_REFUS.type,
      MOTIFS_REFUS.illisible,
    ]);
    expect(resultats[4]?.id).toBe("pas-un-identifiant");
  });

  it("accepte la tension et la visite d'une personne inscrite plus haut dans le même lot", async () => {
    const [salifou] = await db.select({ id: foyers.id }).from(foyers).where(eq(foyers.nom, "Salifou"));
    const inscription = saisie(uuidV7(), "inscription", {
      foyerId: salifou!.id,
      prenom: "Kossi",
      nom: "Salifou",
      sexe: "M",
      dateNaissance: "1966-01-01",
      programme: { code: "hypertension", dateReference: aujourdhui },
    });
    const mesure = saisie(inscription.patientId, "mesure", { mesures: { tensionSys: 150, tensionDia: 95 } });
    const visite = saisie(inscription.patientId, "visite_domicile", { constat: "a_orienter" });
    expect((await envoyer([inscription, mesure, visite])).map((r) => r.statut)).toEqual(["accepte", "accepte", "accepte"]);
    const tournee = await tourneeDuRelais(db, koffi, "Koffi Agbessi", aujourdhui, maintenant);
    const kossi = tournee.foyers.find((f) => f.nom === "Salifou")?.personnes.find((p) => p.prenom === "Kossi");
    expect(kossi).toMatchObject({ id: inscription.patientId, vueAujourdhui: true });
  });

  it("transmet au centre le signe de danger vu par le relais, avec 15 minutes dès la réception", async () => {
    const signal = saisie(await idPatient(db, "Rachida"), "signalement_danger", { signes: ["fievre"], source: "relais" });
    expect(await envoyer([signal])).toEqual([{ id: signal.id, statut: "accepte" }]);
    const [alerte] = await db.select().from(alertes).where(eq(alertes.evenementId, signal.id));
    expect(alerte?.echeance).toEqual(new Date("2026-09-25T10:15:00Z"));
    const [evenement] = await db.select().from(evenements).where(eq(evenements.id, signal.id));
    expect(evenement).toMatchObject({ auteurId: koffi, survenuLe: new Date("2026-09-25T09:30:00.000Z"), donnees: { signes: ["fievre"], source: "relais" } });
  });
});
