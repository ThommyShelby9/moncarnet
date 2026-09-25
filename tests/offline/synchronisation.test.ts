import "fake-indexeddb/auto";
import { createStore } from "idb-keyval";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EvenementEntrant, ResultatSync } from "@/domain/synchronisation";
import { versServeur, type SaisieEnAttente } from "@/offline/file";
import { stockageNavigateur } from "@/offline/stockage";
import { NonConnecte, synchroniserFile, telechargerTournee, transportNavigateur, type Transport } from "@/offline/synchronisation";

let n = 0;
const nouveau = () => stockageNavigateur(createStore(`test-sync-${n++}`, "donnees"));
const saisie = (id: string, avecNote = false): SaisieEnAttente => ({
  id,
  patientId: "p",
  type: "visite_domicile",
  survenuLe: "2026-09-25T09:30:00.000Z",
  donnees: { constat: "tout_va_bien", noteVocale: avecNote },
  libelle: `Visite ${id}`,
  groupe: id,
  nature: "visite",
  avecNote,
});
const note = { type: "audio/webm", octets: new Uint8Array([1, 2, 3]).buffer, dureeSecondes: 3 };
const toutAccepter = (lot: EvenementEntrant[]): ResultatSync[] => lot.map((s) => ({ id: s.id, statut: "accepte" }));
const sansReseau = () => Promise.reject(new TypeError("Failed to fetch"));

afterEach(() => vi.unstubAllGlobals());

describe("synchroniserFile", () => {
  it("vide la file quand tout est reçu, puis envoie la note de la visite", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a", true), saisie("b")]);
    await stockage.ecrireNote("a", note);
    const appels: string[] = [];
    const transport: Transport = {
      envoyerLot: async (lot) => {
        appels.push(`lot:${lot.map((s) => s.id).join(",")}`);
        return toutAccepter(lot);
      },
      envoyerNote: async (id) => {
        appels.push(`note:${id}`);
        return true;
      },
    };
    expect(await synchroniserFile(stockage, transport)).toEqual({ recues: 2, refusees: 0, notes: 1, horsLigne: false, nonConnecte: false });
    expect(appels).toEqual(["lot:a,b", "note:a"]);
    expect(await stockage.lire("file")).toEqual([]);
    expect(await stockage.lire("notes")).toEqual([]);
    expect(await stockage.lireNote("a")).toBeUndefined();
  });

  it("garde tout sans réseau, puis envoie au retour du réseau", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a"), saisie("b")]);
    expect(await synchroniserFile(stockage, { envoyerLot: sansReseau, envoyerNote: sansReseau })).toMatchObject({ recues: 0, horsLigne: true });
    expect(await stockage.lire("file")).toHaveLength(2);
    expect(await synchroniserFile(stockage, { envoyerLot: async (lot) => toutAccepter(lot), envoyerNote: sansReseau })).toMatchObject({
      recues: 2,
      horsLigne: false,
    });
    expect(await stockage.lire("file")).toEqual([]);
  });

  it("met de côté une saisie refusée avec sa raison, et retire sa note", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a"), saisie("b", true)]);
    await stockage.ecrireNote("b", note);
    const envoyerNote = vi.fn(async () => true);
    const bilan = await synchroniserFile(
      stockage,
      {
        envoyerLot: async () => [
          { id: "a", statut: "accepte" },
          { id: "b", statut: "refuse", motif: "Cette personne n'est pas dans votre tournée." },
        ],
        envoyerNote,
      },
      () => new Date("2026-09-25T10:00:00Z"),
    );
    expect(bilan).toMatchObject({ recues: 1, refusees: 1, notes: 0 });
    expect(await stockage.lire("refus")).toEqual([
      { saisie: saisie("b", true), motif: "Cette personne n'est pas dans votre tournée.", le: "2026-09-25T10:00:00.000Z" },
    ]);
    expect(await stockage.lireNote("b")).toBeUndefined();
    expect(envoyerNote).not.toHaveBeenCalled();
  });

  it("ne perd pas une saisie ajoutée pendant l'envoi", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a")]);
    await synchroniserFile(stockage, {
      envoyerLot: async (lot) => {
        await stockage.modifier("file", (f) => [...f, saisie("nouvelle")]);
        return toutAccepter(lot);
      },
      envoyerNote: sansReseau,
    });
    expect((await stockage.lire("file")).map((s) => s.id)).toEqual(["nouvelle"]);
  });

  it("garde la note pour plus tard si le réseau coupe pendant son envoi", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a", true)]);
    await stockage.ecrireNote("a", note);
    expect(await synchroniserFile(stockage, { envoyerLot: async (lot) => toutAccepter(lot), envoyerNote: sansReseau })).toMatchObject({
      recues: 1,
      notes: 0,
      horsLigne: true,
    });
    expect(await stockage.lire("notes")).toEqual(["a"]);
    expect(await stockage.lireNote("a")).toBeDefined();
  });

  it("le dit quand la session a expiré, sans rien perdre", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a")]);
    expect(await synchroniserFile(stockage, { envoyerLot: () => Promise.reject(new NonConnecte()), envoyerNote: sansReseau })).toMatchObject({
      nonConnecte: true,
      horsLigne: false,
    });
    expect(await stockage.lire("file")).toHaveLength(1);
  });
});

describe("transportNavigateur", () => {
  it("envoie le lot en JSON et lit les réponses", async () => {
    const simule = vi.fn(async () => Response.json({ resultats: [{ id: "a", statut: "accepte" }] }));
    vi.stubGlobal("fetch", simule);
    expect(await transportNavigateur().envoyerLot([versServeur(saisie("a"))])).toEqual([{ id: "a", statut: "accepte" }]);
    expect(simule).toHaveBeenCalledWith("/api/sync", expect.objectContaining({ method: "POST" }));
  });

  it("distingue la session expirée, la note refusée pour de bon et le serveur en panne", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    await expect(transportNavigateur().envoyerLot([])).rejects.toBeInstanceOf(NonConnecte);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    expect(await transportNavigateur().envoyerNote("a", note)).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 502 })));
    await expect(transportNavigateur().envoyerNote("a", note)).rejects.toThrow();
  });
});

describe("telechargerTournee", () => {
  it("copie la tournée sur le téléphone, et garde l'ancienne sans réseau", async () => {
    const stockage = nouveau();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ relais: "Koffi Agbessi", prepareeLe: "2026-09-25T07:00:00.000Z", aujourdhui: "2026-09-25", foyers: [] })));
    expect(await telechargerTournee(stockage)).toBe("ok");
    vi.stubGlobal("fetch", vi.fn(sansReseau));
    expect(await telechargerTournee(stockage)).toBe("hors_ligne");
    expect((await stockage.lire("tournee"))?.relais).toBe("Koffi Agbessi");
  });
});
