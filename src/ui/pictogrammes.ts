import type { MotifRdv } from "@/domain/programmes";
import type { CodeSigne } from "@/domain/signes-danger";
import type { MomentPrise } from "@/domain/temps";
import type { NomIcone } from "./icones";

export const ICONE_MOTIF: Record<MotifRdv, NomIcone> = {
  consultation: "hi-stethoscope",
  tension: "hi-blood-pressure",
  grossesse: "hi-pregnant",
  vaccin: "hi-syringe-vaccine",
  diabete: "hi-diabetes-measure",
  fievre: "hi-chills-fever",
  dents: "hi-tooth",
};

export const ICONE_SIGNE: Record<CodeSigne, NomIcone> = {
  saignement: "hi-blood-drop",
  fievre: "hi-chills-fever",
  maux_de_tete: "hi-headache",
  gonflement: "hi-foot",
  bebe_ne_bouge_plus: "hi-fetus",
  perte_des_eaux: "ph-drop",
  debut_travail: "ph-baby",
  douleur: "hi-pain",
  respiration: "hi-lungs",
  vomissements: "hi-vomiting",
  diarrhee: "hi-diarrhea",
  autre: "ph-question",
};

/** Moments de la journée plutôt que des heures : soleil levant, soleil, lune. */
export const ICONE_MOMENT: Record<MomentPrise, NomIcone> = {
  matin: "ph-sun-horizon",
  midi: "ph-sun",
  soir: "ph-moon",
};
