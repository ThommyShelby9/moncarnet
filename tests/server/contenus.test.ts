import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONTENUS_DE_BASE } from "@/domain/contenus";
import { audioDuContenu, contenuPour, enregistrerAudio, listerContenus, MAX_AUDIO_OCTETS, modifierTexte, supprimerAudio } from "@/server/contenus";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { creerDbDeTest } from "../aides/base-de-test";

const aujourdhui = "2026-09-26";
let db: Db;
let fermer: () => Promise<void>;
let admin: { id: string; role: "admin" };
let codjo: { id: string; role: "patient" };
const son = new Uint8Array(2000).fill(7);

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [a] = await db.select().from(comptes).where(eq(comptes.identifiant, "admin"));
  const [c] = await db.select().from(comptes).where(eq(comptes.identifiant, "+2290197000001"));
  admin = { id: a!.id, role: "admin" };
  codjo = { id: c!.id, role: "patient" };
});
afterAll(async () => fermer());

describe("contenus gérés", () => {
  it("liste les contenus de base par catégorie, en français, sans audio au départ", async () => {
    const liste = await listerContenus(db);
    expect(liste.map((c) => c.code).sort()).toEqual(CONTENUS_DE_BASE.map((c) => c.code).sort());
    const soir = liste.find((c) => c.code === "prise_soir")!;
    expect(soir).toMatchObject({ categorie: "traitement", titre: expect.any(String) });
    expect(soir.traductions).toEqual([expect.objectContaining({ langue: "fr", texte: expect.stringContaining("soir"), audio: false })]);
  });

  it("modifie un texte, seulement pour l'administration, avec un français non vide", async () => {
    expect(await modifierTexte(db, { compte: admin, code: "prise_soir", langue: "fr", texte: "  Ce soir : un comprimé, avec de l'eau.  " })).toEqual({ ok: true, donnees: null });
    expect((await contenuPour(db, "prise_soir", "fr"))?.texte).toBe("Ce soir : un comprimé, avec de l'eau.");
    expect(await modifierTexte(db, { compte: codjo, code: "prise_soir", langue: "fr", texte: "Piraté" })).toEqual({ ok: false, erreur: "interdit" });
    expect(await modifierTexte(db, { compte: admin, code: "prise_soir", langue: "fr", texte: " " })).toEqual({ ok: false, erreur: "invalide" });
    expect(await modifierTexte(db, { compte: admin, code: "prise_soir", langue: "fr", texte: "x".repeat(801) })).toEqual({ ok: false, erreur: "invalide" });
    expect(await modifierTexte(db, { compte: admin, code: "inconnu", langue: "fr", texte: "Bonjour" })).toEqual({ ok: false, erreur: "introuvable" });
    // En fon, l'écrit est facultatif : beaucoup parlent le fon sans l'écrire.
    expect(await modifierTexte(db, { compte: admin, code: "prise_soir", langue: "fon", texte: "" })).toEqual({ ok: true, donnees: null });
  });

  it("enregistre une version audio en fon, jouée à la place de la voix du téléphone", async () => {
    expect(await enregistrerAudio(db, { compte: admin, code: "prise_soir", langue: "fon", type: "audio/webm;codecs=opus", octets: son })).toEqual({ ok: true, donnees: null });
    const pour = await contenuPour(db, "prise_soir", "fon");
    expect(pour).toMatchObject({ texte: "Ce soir : un comprimé, avec de l'eau.", langueAudio: "fon", audio: expect.stringMatching(/^\/api\/contenus\/prise_soir\/fon\?v=\d+$/) });
    expect(await audioDuContenu(db, "prise_soir", "fon")).toEqual({ type: "audio/webm", octets: son });
    // Une autre langue sans enregistrement : le texte français, lu par la voix du téléphone.
    expect(await contenuPour(db, "prise_soir", "yo")).toMatchObject({ audio: null, langueAudio: null });
  });

  it("refuse un fichier qui n'est pas du son, trop lourd, ou d'un autre compte", async () => {
    expect(await enregistrerAudio(db, { compte: admin, code: "prise_soir", langue: "fon", type: "text/plain", octets: son })).toEqual({ ok: false, erreur: "invalide" });
    expect(await enregistrerAudio(db, { compte: admin, code: "prise_soir", langue: "fon", type: "audio/ogg", octets: new Uint8Array(MAX_AUDIO_OCTETS + 1) })).toEqual({ ok: false, erreur: "trop_lourd" });
    expect(await enregistrerAudio(db, { compte: codjo, code: "prise_soir", langue: "fon", type: "audio/ogg", octets: son })).toEqual({ ok: false, erreur: "interdit" });
    expect(await enregistrerAudio(db, { compte: admin, code: "prise_soir", langue: "klingon" as never, type: "audio/ogg", octets: son })).toEqual({ ok: false, erreur: "invalide" });
  });

  it("supprime un enregistrement", async () => {
    expect(await supprimerAudio(db, { compte: admin, code: "prise_soir", langue: "fon" })).toEqual({ ok: true, donnees: null });
    expect(await contenuPour(db, "prise_soir", "fon")).toMatchObject({ audio: null });
    expect(await audioDuContenu(db, "prise_soir", "fon")).toBeNull();
  });

  it("garde les textes et les enregistrements quand la démo est remise à zéro", async () => {
    await modifierTexte(db, { compte: admin, code: "danger_conseil", langue: "fr", texte: "Venez au centre tout de suite." });
    await enregistrerAudio(db, { compte: admin, code: "danger_conseil", langue: "fon", type: "audio/ogg", octets: son });
    await semerDemo(db, { aujourdhui });
    expect(await contenuPour(db, "danger_conseil", "fon")).toMatchObject({ texte: "Venez au centre tout de suite.", langueAudio: "fon" });
    expect((await listerContenus(db)).map((c) => c.code).sort()).toEqual(CONTENUS_DE_BASE.map((c) => c.code).sort());
  });
});
