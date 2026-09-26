import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ajouterJours } from "@/domain/dates";
import type { Db } from "@/server/db/client";
import { comptes, listeAttente, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { agendaDuCentre, detailPlage, donnerPlace, modifierCapacite, ouvrirPlage } from "@/server/soignant/agenda";
import { creerDbDeTest } from "../aides/base-de-test";
import { idPatient } from "../aides/demo";

const aujourdhui = "2026-09-28"; // un lundi
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

describe("agenda du centre", () => {
  it("liste les plages de la semaine dans l'ordre, avec les places prises", async () => {
    const plages = await agendaDuCentre(db, firmin.etablissementId, aujourdhui, 7);
    expect(plages.length).toBeGreaterThan(5);
    expect(plages.every((p) => p.date >= aujourdhui && p.date < ajouterJours(aujourdhui, 7))).toBe(true);
    const cles = plages.map((p) => `${p.date}-${p.moment === "matin" ? 0 : 1}-${p.motif}`);
    expect([...cles].sort()).toEqual(cles);
    // Le premier contrôle de tension à venir est complet dans la démo.
    const tension = plages.find((p) => p.motif === "tension" && p.date > aujourdhui)!;
    expect(tension.prises).toBe(tension.capacite);
  });

  it("ne compte pas une place annulée et compte la liste d'attente de la plage", async () => {
    const [plage] = (await agendaDuCentre(db, firmin.etablissementId, ajouterJours(aujourdhui, 1), 7)).filter((p) => p.motif === "consultation" && p.prises > 0);
    const [rdv] = await db.select({ id: rendezVous.id }).from(rendezVous).where(and(eq(rendezVous.creneauId, plage!.creneauId), isNull(rendezVous.annuleLe))).limit(1);
    await db.update(rendezVous).set({ annuleLe: new Date() }).where(eq(rendezVous.id, rdv!.id));
    // La fièvre se soigne pendant les consultations : elle attend une place de la plage « consultation ».
    await db.insert(listeAttente).values({ patientId: await idPatient(db, "Mariam"), etablissementId: firmin.etablissementId, motif: "fievre", dateSouhaitee: plage!.date, moment: plage!.moment });
    const apres = (await agendaDuCentre(db, firmin.etablissementId, plage!.date, 1)).find((p) => p.creneauId === plage!.creneauId)!;
    expect(apres.prises).toBe(plage!.prises - 1);
    expect(apres.enAttente).toBe(plage!.enAttente + 1);
  });
});

describe("détail d'une plage", () => {
  it("donne les personnes inscrites et la liste d'attente", async () => {
    const tension = (await agendaDuCentre(db, firmin.etablissementId, aujourdhui, 7)).find((p) => p.motif === "tension" && p.date > aujourdhui)!;
    const detail = await detailPlage(db, firmin.etablissementId, tension.creneauId);
    expect(detail?.plage).toEqual(tension);
    expect(detail?.inscrits).toHaveLength(tension.prises);
    expect(detail?.inscrits[0]).toMatchObject({ patientId: expect.any(String), prenom: expect.any(String), naissance: expect.any(String) });
    expect(detail?.attente).toHaveLength(tension.enAttente);
  });

  it("refuse la plage d'un autre centre ou un identifiant invalide", async () => {
    const [plage] = await agendaDuCentre(db, firmin.etablissementId, aujourdhui, 7);
    expect(await detailPlage(db, randomUUID(), plage!.creneauId)).toBeNull();
    expect(await detailPlage(db, firmin.etablissementId, "pas-un-uuid")).toBeNull();
  });
});

describe("capacité d'une plage", () => {
  it("ne descend jamais sous le nombre de places prises", async () => {
    const tension = (await agendaDuCentre(db, firmin.etablissementId, aujourdhui, 7)).find((p) => p.motif === "tension" && p.date > aujourdhui)!;
    expect(await modifierCapacite(db, { soignant: firmin, creneauId: tension.creneauId, capacite: tension.prises - 1 })).toEqual({ ok: false, erreur: "trop_bas" });
    expect(await modifierCapacite(db, { soignant: firmin, creneauId: tension.creneauId, capacite: tension.prises + 2 })).toEqual({ ok: true, donnees: { capacite: tension.prises + 2 } });
    const apres = await detailPlage(db, firmin.etablissementId, tension.creneauId);
    expect(apres?.plage.capacite).toBe(tension.prises + 2);
  });

  it("refuse un autre centre et une capacité impossible", async () => {
    const [plage] = await agendaDuCentre(db, firmin.etablissementId, aujourdhui, 7);
    const ailleurs = { id: firmin.id, etablissementId: randomUUID() };
    expect(await modifierCapacite(db, { soignant: ailleurs, creneauId: plage!.creneauId, capacite: 20 })).toEqual({ ok: false, erreur: "interdit" });
    for (const capacite of [0, 2.5, 500]) {
      expect(await modifierCapacite(db, { soignant: firmin, creneauId: plage!.creneauId, capacite })).toEqual({ ok: false, erreur: "invalide" });
    }
  });
});

describe("ouvrir une plage", () => {
  const samedi = "2026-10-03";

  it("ouvre une plage une seule fois", async () => {
    const e = { soignant: firmin, date: samedi, moment: "matin" as const, motif: "grossesse" as const, capacite: 6, aujourdhui };
    const r = await ouvrirPlage(db, e);
    expect(r).toEqual({ ok: true, donnees: { creneauId: expect.any(String) } });
    expect((await agendaDuCentre(db, firmin.etablissementId, samedi, 1)).map((p) => p.motif)).toContain("grossesse");
    expect(await ouvrirPlage(db, e)).toEqual({ ok: false, erreur: "deja_ouverte" });
  });

  it("refuse le passé, un jour trop lointain, un motif sans plage et une capacité impossible", async () => {
    const base = { soignant: firmin, date: samedi, moment: "apres_midi" as const, motif: "vaccin" as const, capacite: 6, aujourdhui };
    expect(await ouvrirPlage(db, { ...base, date: ajouterJours(aujourdhui, -1) })).toEqual({ ok: false, erreur: "invalide" });
    expect(await ouvrirPlage(db, { ...base, date: ajouterJours(aujourdhui, 61) })).toEqual({ ok: false, erreur: "invalide" });
    expect(await ouvrirPlage(db, { ...base, motif: "fievre" as const })).toEqual({ ok: false, erreur: "invalide" });
    expect(await ouvrirPlage(db, { ...base, capacite: 0 })).toEqual({ ok: false, erreur: "invalide" });
    expect(await ouvrirPlage(db, { ...base, date: "2026-13-45" })).toEqual({ ok: false, erreur: "invalide" });
  });
});

describe("donner une place à une personne en attente", () => {
  it("l'inscrit sur la plage et la retire de la liste d'attente", async () => {
    const tension = (await agendaDuCentre(db, firmin.etablissementId, aujourdhui, 7)).find((p) => p.motif === "tension" && p.date > aujourdhui)!;
    expect(tension.prises).toBeLessThan(tension.capacite);
    const [attente] = (await detailPlage(db, firmin.etablissementId, tension.creneauId))!.attente;
    const e = { soignant: firmin, attenteId: attente!.attenteId, creneauId: tension.creneauId };
    expect(await donnerPlace(db, e)).toEqual({ ok: true, donnees: { rendezVousId: expect.any(String) } });
    const apres = (await detailPlage(db, firmin.etablissementId, tension.creneauId))!;
    expect(apres.inscrits.map((i) => i.patientId)).toContain(attente!.patientId);
    expect(apres.attente.map((a) => a.attenteId)).not.toContain(attente!.attenteId);
    expect(await donnerPlace(db, e)).toEqual({ ok: false, erreur: "introuvable" });
  });

  it("refuse une plage complète ou d'un autre centre", async () => {
    const tension = (await agendaDuCentre(db, firmin.etablissementId, aujourdhui, 7)).find((p) => p.motif === "tension" && p.date > aujourdhui)!;
    await modifierCapacite(db, { soignant: firmin, creneauId: tension.creneauId, capacite: tension.prises });
    const [attente] = (await detailPlage(db, firmin.etablissementId, tension.creneauId))!.attente;
    const e = { soignant: firmin, attenteId: attente!.attenteId, creneauId: tension.creneauId };
    expect(await donnerPlace(db, e)).toEqual({ ok: false, erreur: "complet" });
    expect(await donnerPlace(db, { ...e, soignant: { id: firmin.id, etablissementId: randomUUID() } })).toEqual({ ok: false, erreur: "interdit" });
  });
});
