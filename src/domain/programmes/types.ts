import type { DateISO } from "../dates";

export const CODES_PROGRAMMES = ["consultation", "hypertension", "grossesse", "vaccination", "diabete"] as const;
export type CodeProgramme = (typeof CODES_PROGRAMMES)[number];

export const MOTIFS_RDV = ["consultation", "tension", "grossesse", "vaccin", "diabete", "fievre", "dents"] as const;
export type MotifRdv = (typeof MOTIFS_RDV)[number];

export type NiveauRisque = "normal" | "surveillance" | "eleve";

export interface DefinitionEtape {
  code: string;
  libelle: string;
  /** Jours après la date de référence (dernières règles, naissance, diagnostic). */
  cibleJours: number;
  debutFenetreJours: number;
  finFenetreJours: number;
  /** Jours après la date prévue au-delà desquels l'étape est manquée. */
  toleranceManqueJours: number;
  motif: MotifRdv;
  /** Faux pour une étape qui n'est pas un rendez-vous (accouchement prévu). */
  rendezVous: boolean;
  details?: string;
}

export interface Programme {
  code: CodeProgramme;
  nom: string;
  libelleReference: string;
  etapes(dateReference: DateISO, dateInscription: DateISO): DefinitionEtape[];
}
