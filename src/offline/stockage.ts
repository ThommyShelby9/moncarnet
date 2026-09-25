import { clear, createStore, del, get, set, update, type UseStore } from "idb-keyval";
import type { Tournee } from "@/domain/tournee";
import type { Refus, SaisieEnAttente } from "./file";

/** Note vocale gardée sur le téléphone jusqu'à son envoi (octets bruts : IndexedDB les garde partout, contrairement à certains Blob). */
export interface NoteLocale {
  type: string;
  octets: ArrayBuffer;
  dureeSecondes: number;
}

/** Ce que le téléphone garde pour la tournée. */
export interface ContenuRelais {
  tournee: Tournee | null;
  file: SaisieEnAttente[];
  refus: Refus[];
  /** Identifiants des visites reçues dont la note vocale doit encore partir. */
  notes: string[];
}

const VIDE: ContenuRelais = { tournee: null, file: [], refus: [], notes: [] };

export interface StockageRelais {
  lire<K extends keyof ContenuRelais>(cle: K): Promise<ContenuRelais[K]>;
  /** Lecture et écriture dans une seule transaction : deux ajouts qui se croisent ne s'écrasent pas. */
  modifier<K extends keyof ContenuRelais>(cle: K, fn: (actuel: ContenuRelais[K]) => ContenuRelais[K]): Promise<void>;
  lireNote(id: string): Promise<NoteLocale | undefined>;
  ecrireNote(id: string, note: NoteLocale): Promise<void>;
  supprimerNote(id: string): Promise<void>;
  /** À la déconnexion : le téléphone peut être partagé (spec §10.4). */
  toutEffacer(): Promise<void>;
}

export function stockageNavigateur(magasin: UseStore = createStore("moncarnet-relais", "donnees")): StockageRelais {
  return {
    lire: async (cle) => (await get(cle, magasin)) ?? VIDE[cle],
    modifier: (cle, fn) => update(cle, (actuel) => fn(actuel ?? VIDE[cle]), magasin),
    lireNote: (id) => get<NoteLocale>(`note:${id}`, magasin),
    ecrireNote: (id, note) => set(`note:${id}`, note, magasin),
    supprimerNote: (id) => del(`note:${id}`, magasin),
    toutEffacer: () => clear(magasin),
  };
}
