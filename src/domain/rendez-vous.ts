import { joursEntre, type DateISO } from "./dates";
import type { CodeProgramme, MotifRdv } from "./programmes/types";
import { libelleDansJours, libelleJour, nombreDeSoleils } from "./temps";

/** Mot sous chaque tuile de l'étape « Pour quoi ? ». */
export const LIBELLES_MOTIF: Record<MotifRdv, string> = {
  consultation: "Consultation",
  tension: "Tension",
  grossesse: "Grossesse",
  vaccin: "Vaccin",
  diabete: "Diabète",
  fievre: "Fièvre",
  dents: "Dents",
};

/** Nom d'un rendez-vous pris sans étape de programme. */
export const LIBELLES_RDV: Record<MotifRdv, string> = {
  consultation: "Consultation",
  tension: "Contrôle de la tension",
  grossesse: "Consultation de grossesse",
  vaccin: "Vaccination",
  diabete: "Contrôle du diabète",
  fievre: "Consultation pour la fièvre",
  dents: "Consultation pour les dents",
};

/** Nom des plages du centre, à l'étape « Quel jour ? ». */
export const LIBELLES_PLAGE: Record<MotifRdv, string> = {
  consultation: "Consultations",
  tension: "Contrôles de la tension",
  grossesse: "Consultations de grossesse",
  vaccin: "Séances de vaccination",
  diabete: "Contrôles du diabète",
  fievre: "Consultations",
  dents: "Consultations",
};

/** La fièvre et les dents se voient pendant les consultations générales. */
export function motifDePlage(motif: MotifRdv): MotifRdv {
  return motif === "fievre" || motif === "dents" ? "consultation" : motif;
}

const MOTIF_DU_PROGRAMME: Partial<Record<CodeProgramme, MotifRdv>> = {
  hypertension: "tension",
  grossesse: "grossesse",
  vaccination: "vaccin",
  diabete: "diabete",
};

/** Motifs de l'étape « Pour quoi ? » : ceux des programmes suivis d'abord, puis ceux qui conviennent à l'âge. */
export function motifsProposes(personne: { age: number; sexe: "F" | "M"; programmes: CodeProgramme[] }): MotifRdv[] {
  const suivis = personne.programmes.flatMap((code) => MOTIF_DU_PROGRAMME[code] ?? []);
  const selonAge: MotifRdv[] =
    personne.age < 5
      ? ["vaccin", "fievre", "consultation", "dents"]
      : [
          "consultation",
          "fievre",
          ...(personne.sexe === "F" && personne.age >= 15 && personne.age < 50 ? (["grossesse"] as const) : []),
          ...(personne.age >= 18 ? (["tension"] as const) : []),
          "dents",
        ];
  return [...new Set([...suivis, ...selonAge])];
}

export interface CreneauVu {
  id: string;
  date: DateISO;
  moment: "matin" | "apres_midi";
  capacite: number;
  reserves: number;
}

export interface JourPropose extends CreneauVu {
  places: number;
  complet: boolean;
  dansJours: number;
  soleils: number;
  /** « Mercredi », « Mercredi 7 octobre ». */
  libelle: string;
  /** « dans 5 jours ». */
  quand: string;
}

export const MAX_JOURS_PROPOSES = 8;

/** Créneaux proposés à partir de demain, dans l'ordre, complets compris (ils mènent à la liste d'attente). */
export function joursProposes(creneaux: CreneauVu[], aujourdhui: DateISO): JourPropose[] {
  return creneaux
    .filter((c) => joursEntre(aujourdhui, c.date) >= 1)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.moment === b.moment ? 0 : a.moment === "matin" ? -1 : 1))
    .slice(0, MAX_JOURS_PROPOSES)
    .map((c) => {
      const dansJours = joursEntre(aujourdhui, c.date);
      const places = Math.max(0, c.capacite - c.reserves);
      return {
        ...c,
        places,
        complet: places === 0,
        dansJours,
        soleils: nombreDeSoleils(dansJours),
        libelle: libelleJour(c.date, aujourdhui),
        quand: libelleDansJours(dansJours),
      };
    });
}

export function libellePlaces(places: number): string {
  if (places === 0) return "Complet";
  return places === 1 ? "1 place" : `${places} places`;
}
