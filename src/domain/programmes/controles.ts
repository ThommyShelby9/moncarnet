import { joursEntre, type DateISO } from "../dates";
import type { DefinitionEtape, MotifRdv, Programme } from "./types";

const INTERVALLE_JOURS = 90;
const HORIZON_JOURS = 365;

function controlesPeriodiques(motif: MotifRdv, libelle: string) {
  return (dateReference: DateISO, dateInscription: DateISO): DefinitionEtape[] => {
    const ecoule = joursEntre(dateReference, dateInscription);
    const premier = Math.max(1, Math.ceil(ecoule / INTERVALLE_JOURS));
    const etapes: DefinitionEtape[] = [];
    for (let k = premier; k * INTERVALLE_JOURS - ecoule <= HORIZON_JOURS; k++) {
      const cible = k * INTERVALLE_JOURS;
      etapes.push({
        code: `controle-${k}`,
        libelle,
        cibleJours: cible,
        debutFenetreJours: cible - 14,
        finFenetreJours: cible + 14,
        toleranceManqueJours: 7,
        motif,
        rendezVous: true,
      });
    }
    return etapes;
  };
}

export const hypertension: Programme = {
  code: "hypertension",
  nom: "Suivi de la tension",
  libelleReference: "Date du diagnostic",
  etapes: controlesPeriodiques("tension", "Contrôle de la tension"),
};

export const diabete: Programme = {
  code: "diabete",
  nom: "Suivi du diabète",
  libelleReference: "Date du diagnostic",
  etapes: controlesPeriodiques("diabete", "Contrôle du diabète"),
};

export const consultation: Programme = {
  code: "consultation",
  nom: "Consultation générale",
  libelleReference: "Date d'inscription",
  etapes: () => [],
};
