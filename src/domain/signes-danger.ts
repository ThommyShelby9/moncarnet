export const CODES_SIGNES = [
  "saignement",
  "fievre",
  "maux_de_tete",
  "gonflement",
  "bebe_ne_bouge_plus",
  "perte_des_eaux",
  "debut_travail",
  "douleur",
  "respiration",
  "vomissements",
  "diarrhee",
  "autre",
] as const;
export type CodeSigne = (typeof CODES_SIGNES)[number];

export const LIBELLES_SIGNES: Record<CodeSigne, string> = {
  saignement: "Saignement",
  fievre: "Forte fièvre",
  maux_de_tete: "Forts maux de tête",
  gonflement: "Pieds ou visage gonflés",
  bebe_ne_bouge_plus: "Le bébé ne bouge plus",
  perte_des_eaux: "Perte des eaux",
  debut_travail: "Le travail a commencé",
  douleur: "Forte douleur",
  respiration: "Respire mal",
  vomissements: "Vomit tout",
  diarrhee: "Diarrhée",
  autre: "Autre problème",
};

/** Conseil affiché tout de suite, avant même que l'alerte parte (spec §10.3). */
export const CONSEIL_URGENCE = "Allez au centre de santé maintenant ou appelez-le. N'attendez pas.";

const GROSSESSE: CodeSigne[] = ["debut_travail", "saignement", "fievre", "maux_de_tete", "gonflement", "bebe_ne_bouge_plus", "perte_des_eaux", "douleur", "autre"];
const JEUNE_ENFANT: CodeSigne[] = ["fievre", "respiration", "diarrhee", "vomissements", "douleur", "autre"];
const ADULTE: CodeSigne[] = ["fievre", "respiration", "douleur", "saignement", "vomissements", "autre"];

/** Signes proposés selon la personne : ceux de la grossesse pour une femme enceinte, ceux du jeune enfant avant 5 ans. */
export function signesProposes(personne: { enceinte: boolean; age: number }): CodeSigne[] {
  if (personne.enceinte) return GROSSESSE;
  if (personne.age < 5) return JEUNE_ENFANT;
  return ADULTE;
}
