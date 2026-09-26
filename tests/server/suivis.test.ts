import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ajouterJours } from "@/domain/dates";
import type { Db } from "@/server/db/client";
import { comptes, evenements, inscriptions, patients } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { tensionsDe } from "@/server/requetes/risques";
import { tourneeDuRelais } from "@/server/requetes/tournee";
import { confierAuRelais } from "@/server/consignes";
import { listesDeSuivi } from "@/server/soignant/suivis";
import { creerDbDeTest } from "../aides/base-de-test";
import { idCompte, idPatient } from "../aides/demo";

const aujourdhui = "2026-09-28";
const maintenant = new Date("2026-09-28T09:00:00Z");
let db: Db;
let fermer: () => Promise<void>;
let firmin: { id: string; etablissementId: string };

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [c] = await db.select().from(comptes).where(eq(comptes.identifiant, "firmin.akpovi"));
  firmin = { id: c!.id, etablissementId: c!.etablissementId! };
});
afterAll(async () => fermer());

describe("listes de suivi du centre", () => {
  it("liste les grossesses du terme le plus proche au plus lointain, avec les consultations manquées", async () => {
    const { grossesses } = await listesDeSuivi(db, firmin.etablissementId, aujourdhui);
    const awa = grossesses.findIndex((l) => l.prenom === "Awa");
    const afiavi = grossesses.findIndex((l) => l.prenom === "Afiavi");
    expect(awa).toBeGreaterThanOrEqual(0);
    expect(afiavi).toBeGreaterThan(awa);
    expect(grossesses[awa]!.detail).toMatch(/^37 SA/);
    expect(grossesses[afiavi]).toMatchObject({ detail: expect.stringMatching(/^29 SA/), alerte: expect.stringMatching(/manquée/), relais: true });
  });

  it("liste les vaccins dus cette semaine ou en retard", async () => {
    const { vaccins } = await listesDeSuivi(db, firmin.etablissementId, aujourdhui);
    expect(vaccins.find((l) => l.prenom === "Sèna")).toMatchObject({ detail: expect.stringMatching(/9 mois.*dans 2 jours/i) });
  });

  it("liste les tensions trop hautes avec le dernier relevé", async () => {
    const { tension } = await listesDeSuivi(db, firmin.etablissementId, aujourdhui);
    const derniere = (await tensionsDe(db, await idPatient(db, "Codjo"))).at(-1)!;
    expect(derniere.sys).toBeGreaterThanOrEqual(140);
    expect(tension.find((l) => l.prenom === "Codjo")).toMatchObject({ detail: expect.stringContaining(`${derniere.sys}/${derniere.dia}`), relais: false });
  });

  it("repère une personne perdue de vue, mais pas celle qui a un rendez-vous à venir", async () => {
    const [perdu] = await db
      .insert(patients)
      .values({ prenom: "Gilles", nom: "Perdu", dateNaissance: "1960-01-01", sexe: "M", codeCourt: "PRDU99", etablissementId: firmin.etablissementId })
      .returning();
    await db.insert(inscriptions).values({ patientId: perdu!.id, programme: "hypertension", dateReference: "2020-01-01", dateInscription: ajouterJours(aujourdhui, -200) });
    const { perdus } = await listesDeSuivi(db, firmin.etablissementId, aujourdhui);
    expect(perdus.find((l) => l.patientId === perdu!.id)).toMatchObject({ alerte: expect.stringMatching(/en retard de [0-9]+ jours/) });
    expect(perdus.some((l) => l.prenom === "Afiavi")).toBe(false);
  });
});

describe("confier au relais", () => {
  it("met la consigne dans la tournée du relais jusqu'à sa visite", async () => {
    const afiavi = await idPatient(db, "Afiavi", "Dossou");
    const koffi = await idCompte(db, "koffi.agbessi");
    const r = await confierAuRelais(db, { soignant: firmin, patientId: afiavi, texte: "  Rappeler la CPN3 de mardi  ", maintenant });
    expect(r).toEqual({ ok: true, donnees: { consigneId: expect.any(String) } });
    const raisons = async (quand: Date) =>
      (await tourneeDuRelais(db, koffi, "Koffi", aujourdhui, quand)).foyers.flatMap((f) => f.personnes).find((p) => p.id === afiavi)!.raisons.map((x) => x.texte);
    expect(await raisons(maintenant)).toContain("Consigne du centre : Rappeler la CPN3 de mardi");
    expect((await listesDeSuivi(db, firmin.etablissementId, aujourdhui)).grossesses.find((l) => l.patientId === afiavi)?.consigne).toBe("Rappeler la CPN3 de mardi");

    const plusTard = new Date(maintenant.getTime() + 3_600_000);
    await db.insert(evenements).values({ id: randomUUID(), patientId: afiavi, type: "visite_domicile", auteurId: koffi, survenuLe: plusTard, donnees: { constats: ["tout_va_bien"] } });
    expect(await raisons(plusTard)).not.toContain("Consigne du centre : Rappeler la CPN3 de mardi");
    expect((await listesDeSuivi(db, firmin.etablissementId, aujourdhui)).grossesses.find((l) => l.patientId === afiavi)?.consigne).toBeNull();
  });

  it("refuse une personne sans relais, d'un autre centre, ou une consigne vide ou trop longue", async () => {
    const codjo = await idPatient(db, "Codjo");
    const afiavi = await idPatient(db, "Afiavi", "Dossou");
    expect(await confierAuRelais(db, { soignant: firmin, patientId: codjo, texte: "Passer le voir" })).toEqual({ ok: false, erreur: "sans_relais" });
    expect(await confierAuRelais(db, { soignant: { id: firmin.id, etablissementId: randomUUID() }, patientId: afiavi, texte: "Passer la voir" })).toEqual({ ok: false, erreur: "interdit" });
    expect(await confierAuRelais(db, { soignant: firmin, patientId: afiavi, texte: "  " })).toEqual({ ok: false, erreur: "invalide" });
    expect(await confierAuRelais(db, { soignant: firmin, patientId: afiavi, texte: "x".repeat(141) })).toEqual({ ok: false, erreur: "invalide" });
  });
});
