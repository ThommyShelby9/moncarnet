import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ECHECS_MAX, verifierIdentifiants } from "@/server/auth/connexion";
import { hacher, verifier } from "@/server/auth/mots-de-passe";
import { creerSession, lireSession, supprimerSession } from "@/server/auth/sessions";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { creerDbDeTest } from "../../aides/base-de-test";

let db: Db;
let fermer: () => Promise<void>;
const T0 = new Date("2026-09-25T10:00:00Z");
const plusMinutes = (m: number) => new Date(T0.getTime() + m * 60_000);

beforeEach(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await db.insert(comptes).values({
    role: "patient",
    identifiant: "+2290197000001",
    nomAffiche: "Codjo Houngbo",
    empreinteSecret: await hacher("1234"),
  });
});
afterEach(async () => fermer());

describe("empreintes", () => {
  it("vérifie le bon secret et refuse le mauvais", async () => {
    const empreinte = await hacher("1234");
    expect(empreinte.startsWith("scrypt$")).toBe(true);
    expect(await verifier("1234", empreinte)).toBe(true);
    expect(await verifier("4321", empreinte)).toBe(false);
    expect(await verifier("1234", "format-inconnu")).toBe(false);
  });
});

describe("verifierIdentifiants", () => {
  it("connecte avec le bon code", async () => {
    const r = await verifierIdentifiants(db, "+2290197000001", "1234", T0);
    expect(r).toMatchObject({ ok: true, role: "patient" });
  });

  it("refuse un code faux ou un compte inconnu avec le même message", async () => {
    expect(await verifierIdentifiants(db, "+2290197000001", "0000", T0)).toEqual({ ok: false, raison: "identifiants" });
    expect(await verifierIdentifiants(db, "+2290197999999", "1234", T0)).toEqual({ ok: false, raison: "identifiants" });
  });

  it("verrouille après 5 codes faux, refuse le bon code pendant 15 minutes, puis l'accepte", async () => {
    for (let i = 1; i < ECHECS_MAX; i++) {
      expect(await verifierIdentifiants(db, "+2290197000001", "0000", T0)).toEqual({ ok: false, raison: "identifiants" });
    }
    const cinquieme = await verifierIdentifiants(db, "+2290197000001", "0000", T0);
    expect(cinquieme).toMatchObject({ ok: false, raison: "verrouille" });
    expect(await verifierIdentifiants(db, "+2290197000001", "1234", plusMinutes(10))).toMatchObject({ ok: false, raison: "verrouille" });
    expect(await verifierIdentifiants(db, "+2290197000001", "1234", plusMinutes(16))).toMatchObject({ ok: true });
  });

  it("remet le compteur à zéro après une connexion réussie", async () => {
    for (let i = 0; i < ECHECS_MAX - 1; i++) await verifierIdentifiants(db, "+2290197000001", "0000", T0);
    await verifierIdentifiants(db, "+2290197000001", "1234", T0);
    expect(await verifierIdentifiants(db, "+2290197000001", "0000", T0)).toEqual({ ok: false, raison: "identifiants" });
  });
});

describe("sessions", () => {
  async function compteId() {
    const r = await verifierIdentifiants(db, "+2290197000001", "1234", T0);
    if (!r.ok) throw new Error("connexion impossible");
    return r.compteId;
  }

  it("retrouve le compte à partir du jeton", async () => {
    const { jeton } = await creerSession(db, await compteId(), T0);
    expect(await lireSession(db, jeton, plusMinutes(5))).toMatchObject({ nomAffiche: "Codjo Houngbo", role: "patient" });
  });

  it("traite comme déconnecté un jeton absent, inconnu ou expiré", async () => {
    const { jeton } = await creerSession(db, await compteId(), T0);
    expect(await lireSession(db, undefined)).toBeNull();
    expect(await lireSession(db, "jeton-inconnu", T0)).toBeNull();
    expect(await lireSession(db, jeton, plusMinutes(31 * 24 * 60))).toBeNull();
  });

  it("oublie la session à la déconnexion", async () => {
    const { jeton } = await creerSession(db, await compteId(), T0);
    await supprimerSession(db, jeton);
    expect(await lireSession(db, jeton, T0)).toBeNull();
  });
});
