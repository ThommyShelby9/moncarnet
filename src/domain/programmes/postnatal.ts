import type { DefinitionEtape, Programme } from "./types";

function visite(code: string, libelle: string, cible: number, debut: number, fin: number): DefinitionEtape {
  return { code, libelle, cibleJours: cible, debutFenetreJours: debut, finFenetreJours: fin, toleranceManqueJours: 7, motif: "grossesse", rendezVous: true };
}

/** Après l'accouchement, la mère est revue au 3ᵉ jour, dans la 2ᵉ semaine et à 6 semaines (valeurs indicatives). */
const ETAPES: DefinitionEtape[] = [
  visite("cpon1", "Visite du 3ᵉ jour après la naissance", 3, 1, 6),
  visite("cpon2", "Visite de la 2ᵉ semaine après la naissance", 10, 7, 14),
  visite("cpon3", "Visite des 6 semaines après la naissance", 42, 35, 56),
];

export const postnatal: Programme = {
  code: "postnatal",
  nom: "Suivi après l'accouchement",
  libelleReference: "Date de l'accouchement",
  etapes: () => ETAPES,
};
