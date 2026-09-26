import { codeConseilsGrossesse, CONTENUS_DE_BASE, lignesDuContenu } from "./contenus";
import { joursEntre, type DateISO } from "./dates";
import { termePrevu } from "./programmes/grossesse";

export interface Taille {
  semaine: number;
  cm: number;
  grammes: number;
  /** Comparaison avec ce qu'on trouve au marché : plus parlant qu'un chiffre. */
  comme: string;
}

/** Taille (tête-talons) et poids moyens du bébé : valeurs indicatives. */
const TAILLES: Taille[] = [
  { semaine: 8, cm: 1.6, grammes: 1, comme: "un grain d'arachide" },
  { semaine: 12, cm: 6, grammes: 14, comme: "une noix de cola" },
  { semaine: 16, cm: 12, grammes: 100, comme: "un citron" },
  { semaine: 20, cm: 25, grammes: 300, comme: "une mangue" },
  { semaine: 24, cm: 30, grammes: 600, comme: "un épi de maïs" },
  { semaine: 28, cm: 37, grammes: 1000, comme: "une papaye" },
  { semaine: 32, cm: 42, grammes: 1700, comme: "un ananas" },
  { semaine: 36, cm: 47, grammes: 2600, comme: "une igname" },
  { semaine: 40, cm: 51, grammes: 3400, comme: "une petite pastèque" },
];


export interface SuiviDeGrossesse {
  semaines: number;
  jours: number;
  trimestre: 1 | 2 | 3;
  terme: DateISO;
  joursAvantTerme: number;
  taille: Taille;
  conseils: string[];
}

/** La grossesse semaine par semaine, à partir de la date des dernières règles. */
export function suiviDeGrossesse(ddr: DateISO, aujourdhui: DateISO): SuiviDeGrossesse {
  const ecoule = Math.max(0, joursEntre(ddr, aujourdhui));
  const semaines = Math.floor(ecoule / 7);
  const trimestre = semaines < 14 ? 1 : semaines < 28 ? 2 : 3;
  const terme = termePrevu(ddr);
  return {
    semaines,
    jours: ecoule % 7,
    trimestre,
    terme,
    joursAvantTerme: joursEntre(aujourdhui, terme),
    taille: [...TAILLES].reverse().find((t) => t.semaine <= semaines) ?? TAILLES[0]!,
    conseils: lignesDuContenu(CONTENUS_DE_BASE.find((c) => c.code === codeConseilsGrossesse(trimestre))!.texte),
  };
}

/** « Préparer la naissance » : ce qu'il faut avoir prévu avant le jour J (plan d'accouchement). */
export const ELEMENTS_PLAN = [
  { code: "lieu", libelle: "Je sais où accoucher", detail: "À la maternité du centre de santé, avec une sage-femme" },
  { code: "transport", libelle: "J'ai prévu comment y aller, même la nuit", detail: "Un zémidjan ou un taxi, et son numéro" },
  { code: "accompagnant", libelle: "Quelqu'un m'accompagnera", detail: "Mon mari, ma mère, une amie" },
  { code: "argent", libelle: "J'ai mis de l'argent de côté", detail: "Pour le transport et les soins" },
  { code: "sac", libelle: "Mon sac est prêt", detail: "Pagnes, layette, savon, serviettes, et ce carnet" },
  { code: "sang", libelle: "Un proche peut donner son sang", detail: "Au cas où il en faudrait" },
] as const;
export type CodePlan = (typeof ELEMENTS_PLAN)[number]["code"];
export const CODES_PLAN = ELEMENTS_PLAN.map((e) => e.code) as [CodePlan, ...CodePlan[]];
