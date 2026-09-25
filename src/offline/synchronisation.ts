import { MAX_LOT, type EvenementEntrant, type ResultatSync } from "@/domain/synchronisation";
import type { Tournee } from "@/domain/tournee";
import { trierReponses, versServeur, type Tri } from "./file";
import type { NoteLocale, StockageRelais } from "./stockage";

export interface Transport {
  /** Lève une erreur sans réseau ou si le serveur ne répond pas : la file reste intacte. */
  envoyerLot(lot: EvenementEntrant[]): Promise<ResultatSync[]>;
  /** Vrai si la note est reçue, faux si elle est refusée pour de bon ; lève une erreur sans réseau. */
  envoyerNote(id: string, note: NoteLocale): Promise<boolean>;
}

/** Session expirée : les saisies restent sur le téléphone, le relais doit se reconnecter. */
export class NonConnecte extends Error {
  constructor() {
    super("Session expirée");
    this.name = "NonConnecte";
  }
}

export interface Bilan {
  recues: number;
  refusees: number;
  notes: number;
  horsLigne: boolean;
  nonConnecte: boolean;
}

/** Vide la file d'envoi : les saisies d'abord, dans l'ordre, puis les notes vocales des visites reçues. */
export async function synchroniserFile(stockage: StockageRelais, transport: Transport, maintenant: () => Date = () => new Date()): Promise<Bilan> {
  const bilan: Bilan = { recues: 0, refusees: 0, notes: 0, horsLigne: false, nonConnecte: false };
  try {
    const file = await stockage.lire("file");
    for (let debut = 0; debut < file.length; debut += MAX_LOT) {
      const resultats = await transport.envoyerLot(file.slice(debut, debut + MAX_LOT).map(versServeur));
      let tri: Tri = { restantes: [], refus: [], notesAEnvoyer: [], recues: 0 };
      // La file a pu grandir pendant l'envoi : on range la file du moment, les saisies ajoutées entre-temps restent.
      await stockage.modifier("file", (actuelle) => {
        tri = trierReponses(actuelle, resultats, maintenant());
        return tri.restantes;
      });
      if (tri.refus.length) await stockage.modifier("refus", (r) => [...r, ...tri.refus]);
      if (tri.notesAEnvoyer.length) await stockage.modifier("notes", (n) => [...n, ...tri.notesAEnvoyer]);
      for (const r of tri.refus) if (r.saisie.avecNote) await stockage.supprimerNote(r.saisie.id);
      bilan.recues += tri.recues;
      bilan.refusees += tri.refus.length;
    }
    for (const id of await stockage.lire("notes")) {
      const note = await stockage.lireNote(id);
      if (note && (await transport.envoyerNote(id, note))) bilan.notes++;
      await stockage.supprimerNote(id);
      await stockage.modifier("notes", (n) => n.filter((x) => x !== id));
    }
  } catch (erreur) {
    if (erreur instanceof NonConnecte) bilan.nonConnecte = true;
    else {
      // Sans réseau (ou serveur injoignable) : tout reste sur le téléphone, l'envoi repartira seul.
      console.warn("Envoi reporté :", erreur);
      bilan.horsLigne = true;
    }
  }
  return bilan;
}

export function transportNavigateur(): Transport {
  return {
    async envoyerLot(lot) {
      const reponse = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evenements: lot }) });
      if (reponse.status === 401) throw new NonConnecte();
      if (!reponse.ok) throw new Error(`Envoi refusé par le serveur (${reponse.status})`);
      return ((await reponse.json()) as { resultats: ResultatSync[] }).resultats;
    },
    async envoyerNote(id, note) {
      const reponse = await fetch(`/api/sync/note?id=${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": note.type }, body: note.octets });
      if (reponse.status === 401) throw new NonConnecte();
      if (reponse.ok) return true;
      if (reponse.status >= 400 && reponse.status < 500) return false;
      throw new Error(`Note vocale refusée par le serveur (${reponse.status})`);
    },
  };
}

/** Copie sur le téléphone la tournée du jour : elle reste lisible toute la journée, même sans réseau. */
export async function telechargerTournee(stockage: StockageRelais): Promise<"ok" | "hors_ligne" | "non_connecte"> {
  try {
    const reponse = await fetch("/api/relais/tournee", { cache: "no-store" });
    if (reponse.status === 401) return "non_connecte";
    if (!reponse.ok) return "hors_ligne";
    const tournee = (await reponse.json()) as Tournee;
    await stockage.modifier("tournee", () => tournee);
    return "ok";
  } catch {
    return "hors_ligne";
  }
}
