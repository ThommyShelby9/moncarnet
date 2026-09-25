import { ajouterJours, joursEntre, type DateISO } from "./dates";
import { MOMENTS_PRISE, type MomentPrise } from "./temps";

export interface LigneTraitement {
  medicament: string;
  matin: number;
  midi: number;
  soir: number;
  dureeJours: number;
  /** « la tension » : dit pourquoi on le prend, en mots simples. */
  indication?: string;
  /** « avec un verre d'eau ». */
  conseil?: string;
}

export interface OrdonnanceVue {
  id: string;
  patientId: string;
  lignes: LigneTraitement[];
  /** Jour de la délivrance à la pharmacie, ou null si elle n'a pas encore eu lieu. */
  delivreeLe: DateISO | null;
}

export interface TraitementEnCours {
  cle: string;
  patientId: string;
  medicament: string;
  indication?: string;
  conseil?: string;
  prises: { moment: MomentPrise; quantite: number }[];
  dernierJour: DateISO;
}

export function cleTraitement(ordonnanceId: string, index: number): string {
  return `${ordonnanceId}:${index}`;
}

/** Une ligne délivrée est un traitement en cours du jour de la délivrance au dernier jour de la durée prescrite. */
export function traitementsEnCours(ordonnances: OrdonnanceVue[], aujourdhui: DateISO): TraitementEnCours[] {
  return ordonnances.flatMap((o) => {
    const delivreeLe = o.delivreeLe;
    if (!delivreeLe || joursEntre(delivreeLe, aujourdhui) < 0) return [];
    return o.lignes.flatMap((ligne, index) => {
      const dernierJour = ajouterJours(delivreeLe, ligne.dureeJours - 1);
      if (joursEntre(aujourdhui, dernierJour) < 0) return [];
      return [
        {
          cle: cleTraitement(o.id, index),
          patientId: o.patientId,
          medicament: ligne.medicament,
          indication: ligne.indication,
          conseil: ligne.conseil,
          prises: MOMENTS_PRISE.filter((m) => ligne[m] > 0).map((m) => ({ moment: m, quantite: ligne[m] })),
          dernierJour,
        },
      ];
    });
  });
}

export type StatutPrise = "fait" | "plus_tard" | "annule";

export interface PriseNotee {
  traitementCle: string;
  moment: MomentPrise;
  statut: StatutPrise;
  survenuLe: Date;
}

export function cleDePrise(traitementCle: string, moment: MomentPrise): string {
  return `${traitementCle}|${moment}`;
}

/** Le dernier mot compte : « C'est fait » puis « Annuler » remet la prise à faire. */
export function statutsDesPrises(prises: PriseNotee[]): Map<string, "fait" | "plus_tard"> {
  const statuts = new Map<string, "fait" | "plus_tard">();
  for (const p of [...prises].sort((a, b) => a.survenuLe.getTime() - b.survenuLe.getTime())) {
    const cle = cleDePrise(p.traitementCle, p.moment);
    if (p.statut === "annule") statuts.delete(cle);
    else statuts.set(cle, p.statut);
  }
  return statuts;
}
