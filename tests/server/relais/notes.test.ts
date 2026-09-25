import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { uuidV7 } from "@/domain/identifiants";
import type { CompteConnecte } from "@/server/auth/sessions";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { enregistrerNote, lireNote } from "@/server/relais/notes";
import { synchroniser } from "@/server/relais/synchronisation";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

let db: Db;
let fermer: () => Promise<void>;
let koffi: string;
let firmin: string;
let centreDeFirmin: string;
let codjo: string;
let afiavi: string;
const octets = new Uint8Array([26, 69, 223, 163, 1, 2, 3]);

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
  koffi = await idCompte(db, "koffi.agbessi");
  firmin = await idCompte(db, "firmin.akpovi");
  centreDeFirmin = (await db.select({ id: comptes.etablissementId }).from(comptes).where(eq(comptes.id, firmin)))[0]!.id!;
  codjo = await idCompte(db, COMPTE.codjo);
  afiavi = await idPatient(db, "Afiavi", "Dossou");
});
afterAll(async () => fermer());

/** Une visite reçue du relais, qui annonce une note vocale. */
async function visite(): Promise<string> {
  const id = uuidV7();
  await synchroniser(db, {
    relaisId: koffi,
    lot: [{ id, patientId: afiavi, type: "visite_domicile", survenuLe: "2026-09-25T09:30:00.000Z", donnees: { constat: "tout_va_bien", noteVocale: true } }],
    maintenant: new Date("2026-09-25T10:00:00Z"),
    aujourdhui: "2026-09-25",
  });
  return id;
}

const compte = (id: string, role: CompteConnecte["role"], etablissementId: string | null = null) => ({ id, role, etablissementId });

describe("notes vocales", () => {
  it("garde la note de la visite une seule fois", async () => {
    const note = { relaisId: koffi, evenementId: await visite(), type: "audio/webm;codecs=opus", octets };
    expect(await enregistrerNote(db, note)).toEqual({ ok: true, donnees: "accepte" });
    expect(await enregistrerNote(db, note)).toEqual({ ok: true, donnees: "deja_recu" });
  });

  it("refuse la note d'un autre compte, sans visite, ou qui n'est pas du son", async () => {
    const id = await visite();
    expect(await enregistrerNote(db, { relaisId: firmin, evenementId: id, type: "audio/webm", octets })).toEqual({ ok: false, erreur: "interdit" });
    expect(await enregistrerNote(db, { relaisId: koffi, evenementId: uuidV7(), type: "audio/webm", octets })).toEqual({ ok: false, erreur: "introuvable" });
    expect(await enregistrerNote(db, { relaisId: koffi, evenementId: id, type: "text/html", octets })).toEqual({ ok: false, erreur: "invalide" });
    expect(await enregistrerNote(db, { relaisId: koffi, evenementId: id, type: "audio/webm", octets: new Uint8Array() })).toEqual({ ok: false, erreur: "invalide" });
  });

  it("s'écoute par son relais et par les soignants du centre de la personne, par personne d'autre", async () => {
    const id = await visite();
    await enregistrerNote(db, { relaisId: koffi, evenementId: id, type: "audio/webm;codecs=opus", octets });
    expect(Array.from((await lireNote(db, compte(koffi, "relais"), id))!.donnees)).toEqual(Array.from(octets));
    expect(await lireNote(db, compte(firmin, "soignant", centreDeFirmin), id)).toMatchObject({ type: "audio/webm;codecs=opus" });
    expect(await lireNote(db, compte(firmin, "soignant", null), id)).toBeNull();
    expect(await lireNote(db, compte(codjo, "patient"), id)).toBeNull();
    expect(await lireNote(db, compte(koffi, "relais"), "pas-un-identifiant")).toBeNull();
  });
});
