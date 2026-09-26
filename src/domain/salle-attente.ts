export interface Passage {
  id: string;
  patientId: string;
  numero: number;
  /** Alerte en cours à l'arrivée : la personne passe devant. */
  urgent: boolean;
  arriveLe: Date;
  appeleLe: Date | null;
}

/** « C'est bientôt votre tour » : quand il ne reste que 2 personnes avant (spec §4.4). */
export const BIENTOT = 2;

export type Place = { etat: "attente"; numero: number; avant: number; bientot: boolean } | { etat: "appele"; numero: number };

/** Ordre de passage : une urgence passe toujours devant, puis l'ordre d'arrivée (le numéro). Les personnes appelées sortent de la file. */
export function fileDAttente<T extends Passage>(passages: T[]): T[] {
  return passages.filter((p) => !p.appeleLe).sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.numero - b.numero);
}

export function placeDe(passages: Passage[], patientId: string): Place | null {
  const moi = passages.find((p) => p.patientId === patientId);
  if (!moi) return null;
  if (moi.appeleLe) return { etat: "appele", numero: moi.numero };
  const avant = fileDAttente(passages).findIndex((p) => p.id === moi.id);
  return { etat: "attente", numero: moi.numero, avant, bientot: avant <= BIENTOT };
}
