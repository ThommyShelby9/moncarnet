import type { DateISO } from "./dates";
import type { ResultatRisque } from "./risque";

/** 0 : passer tout de suite ; 1 : à rattraper ; 2 : à voir pendant la tournée. */
export type Urgence = 0 | 1 | 2;

export interface Raison {
  texte: string;
  urgence: Urgence;
}

export interface EtatPersonne {
  alertesOuvertes: number;
  etapesManquees: string[];
  risque: ResultatRisque;
  ordonnancesARetirer: string[];
  etapesProches: string[];
  /** La cascade de rappels (WhatsApp, SMS, appel) n'a joint personne : au relais de passer. */
  rappelsSansReponse?: boolean;
}

export interface PersonneTournee {
  id: string;
  prenom: string;
  nom: string;
  sexe: "F" | "M";
  age: number;
  libelleAge: string;
  telephone: string | null;
  enceinte: boolean;
  malvoyant: boolean;
  /** Visite déjà notée aujourd'hui (reçue par le serveur, ou saisie sur ce téléphone). */
  vueAujourdhui: boolean;
  raisons: Raison[];
}

export interface FoyerTournee {
  id: string;
  nom: string;
  village: string;
  urgence: Urgence | null;
  personnes: PersonneTournee[];
}

/** Copie de la tournée gardée sur le téléphone du relais. */
export interface Tournee {
  relais: string;
  prepareeLe: string;
  aujourdhui: DateISO;
  foyers: FoyerTournee[];
}

/** Motifs de risque déjà dits autrement : le signalement en attente, les étapes manquées. */
const DEJA_DIT = /^Signe de danger non pris en charge$|rendez-vous manqués$|en retard$/;

/** Pourquoi passer voir cette personne (spec §4.8), la raison la plus urgente d'abord. */
export function raisonsDe(etat: EtatPersonne): Raison[] {
  const raisons: Raison[] = [];
  if (etat.alertesOuvertes > 0) raisons.push({ texte: "Signe de danger signalé, pas encore pris en charge : passer tout de suite", urgence: 0 });
  const motifs = etat.risque.motifs.filter((m) => !DEJA_DIT.test(m));
  if (etat.risque.niveau === "eleve") for (const m of motifs) raisons.push({ texte: m, urgence: 0 });
  for (const e of etat.etapesManquees) raisons.push({ texte: `${e} manquée`, urgence: 1 });
  if (etat.rappelsSansReponse) raisons.push({ texte: "Rappels sans réponse (SMS, appel) : prévenir de vive voix", urgence: 1 });
  if (etat.risque.niveau === "surveillance") for (const m of motifs) raisons.push({ texte: m, urgence: 2 });
  for (const code of etat.ordonnancesARetirer) raisons.push({ texte: `Ordonnance à retirer à la pharmacie (code ${code})`, urgence: 2 });
  for (const e of etat.etapesProches) raisons.push({ texte: `${e} à prévoir cette semaine`, urgence: 2 });
  return raisons.sort((a, b) => a.urgence - b.urgence);
}

export function urgenceDuFoyer(personnes: { raisons: Raison[] }[]): Urgence | null {
  const urgences = personnes.flatMap((p) => p.raisons.map((r) => r.urgence));
  return urgences.length ? (Math.min(...urgences) as Urgence) : null;
}

/** Les foyers urgents d'abord, ceux sans raison de passer à la fin, puis par nom. */
export function trierFoyers<T extends { nom: string; urgence: Urgence | null }>(foyers: T[]): T[] {
  const rang = (u: Urgence | null) => (u === null ? 3 : u);
  return [...foyers].sort((a, b) => rang(a.urgence) - rang(b.urgence) || a.nom.localeCompare(b.nom, "fr"));
}

/** « 1 foyer sur 4 » : parmi les foyers qui ont une raison d'être vus, ceux déjà visités aujourd'hui. */
export function avancement(foyers: { urgence: Urgence | null; personnes: { vueAujourdhui: boolean }[] }[]): { faits: number; aVoir: number } {
  const aVoir = foyers.filter((f) => f.urgence !== null);
  return { faits: aVoir.filter((f) => f.personnes.some((p) => p.vueAujourdhui)).length, aVoir: aVoir.length };
}
