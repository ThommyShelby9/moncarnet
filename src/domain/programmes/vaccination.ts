import type { DefinitionEtape, Programme } from "./types";

function seance(code: string, libelle: string, cible: number, details: string): DefinitionEtape {
  return {
    code,
    libelle,
    cibleJours: cible,
    debutFenetreJours: cible,
    finFenetreJours: cible + (cible === 0 ? 14 : 28),
    toleranceManqueJours: 14,
    motif: "vaccin",
    rendezVous: true,
    details,
  };
}

const ETAPES: DefinitionEtape[] = [
  seance("naissance", "Vaccins de la naissance", 0, "BCG, VPO0"),
  seance("6sem", "Vaccins des 6 semaines", 42, "Penta1, VPO1, PCV1, Rota1"),
  seance("10sem", "Vaccins des 10 semaines", 70, "Penta2, VPO2, PCV2, Rota2"),
  seance("14sem", "Vaccins des 14 semaines", 98, "Penta3, VPO3, PCV3, VPI"),
  seance("9mois", "Vaccins des 9 mois", 270, "Rougeole-rubéole 1, fièvre jaune"),
  seance("15mois", "Vaccins des 15 mois", 450, "Rougeole-rubéole 2"),
];

export const vaccination: Programme = {
  code: "vaccination",
  nom: "Vaccination de l'enfant",
  libelleReference: "Date de naissance",
  etapes: () => ETAPES,
};
