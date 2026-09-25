import { ajouterJours, joursEntre, type DateISO } from "../dates";
import type { DefinitionEtape, Programme } from "./types";

const SA = (semaines: number) => semaines * 7;

function consultation(numero: number, cible: number, debut: number, fin: number): DefinitionEtape {
  return {
    code: `cpn${numero}`,
    libelle: `Consultation prénatale ${numero}`,
    cibleJours: cible,
    debutFenetreJours: debut,
    finFenetreJours: fin,
    toleranceManqueJours: 7,
    motif: "grossesse",
    rendezVous: true,
  };
}

const ETAPES: DefinitionEtape[] = [
  consultation(1, SA(12), 0, SA(16)),
  consultation(2, SA(26), SA(24), SA(28)),
  consultation(3, SA(32), SA(32) - 7, SA(32) + 7),
  consultation(4, SA(36), SA(36) - 7, SA(36) + 7),
  {
    code: "accouchement",
    libelle: "Accouchement prévu",
    cibleJours: 280,
    debutFenetreJours: SA(37),
    finFenetreJours: SA(42),
    toleranceManqueJours: 14,
    motif: "grossesse",
    rendezVous: false,
  },
];

export const grossesse: Programme = {
  code: "grossesse",
  nom: "Suivi de grossesse",
  libelleReference: "Date des dernières règles",
  etapes: () => ETAPES,
};

export function termePrevu(ddr: DateISO): DateISO {
  return ajouterJours(ddr, 280);
}

export function semainesDeGrossesse(ddr: DateISO, le: DateISO): number {
  return Math.floor(joursEntre(ddr, le) / 7);
}
