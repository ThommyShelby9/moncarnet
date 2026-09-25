import "fake-indexeddb/auto";
import { createStore } from "idb-keyval";
import { describe, expect, it } from "vitest";
import type { SaisieEnAttente } from "@/offline/file";
import { stockageNavigateur } from "@/offline/stockage";

let n = 0;
const nomUnique = () => `test-stockage-${n++}`;
const saisie = (id: string): SaisieEnAttente => ({
  id,
  patientId: "p",
  type: "visite_domicile",
  survenuLe: "2026-09-25T09:30:00.000Z",
  donnees: { constat: "absent" },
  libelle: "Visite",
  groupe: id,
  nature: "visite",
});

describe("stockageNavigateur", () => {
  it("part d'un téléphone vide", async () => {
    const s = stockageNavigateur(createStore(nomUnique(), "donnees"));
    expect(await s.lire("tournee")).toBeNull();
    expect(await s.lire("file")).toEqual([]);
    expect(await s.lire("refus")).toEqual([]);
    expect(await s.lire("notes")).toEqual([]);
  });

  it("garde la file d'envoi, même quand deux ajouts se croisent", async () => {
    const nom = nomUnique();
    const s = stockageNavigateur(createStore(nom, "donnees"));
    await Promise.all([s.modifier("file", (f) => [...f, saisie("a")]), s.modifier("file", (f) => [...f, saisie("b")])]);
    const rouvert = stockageNavigateur(createStore(nom, "donnees"));
    expect((await rouvert.lire("file")).map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("garde une note vocale jusqu'à son envoi", async () => {
    const s = stockageNavigateur(createStore(nomUnique(), "donnees"));
    await s.ecrireNote("a", { type: "audio/webm", octets: new Uint8Array([1, 2, 3]).buffer, dureeSecondes: 4 });
    expect((await s.lireNote("a"))?.octets.byteLength).toBe(3);
    await s.supprimerNote("a");
    expect(await s.lireNote("a")).toBeUndefined();
  });

  it("efface tout à la déconnexion", async () => {
    const s = stockageNavigateur(createStore(nomUnique(), "donnees"));
    await s.modifier("file", () => [saisie("a")]);
    await s.ecrireNote("a", { type: "audio/webm", octets: new ArrayBuffer(2), dureeSecondes: 1 });
    await s.toutEffacer();
    expect(await s.lire("file")).toEqual([]);
    expect(await s.lireNote("a")).toBeUndefined();
  });
});
