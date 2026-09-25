import { consultation, diabete, hypertension } from "./controles";
import { grossesse } from "./grossesse";
import type { CodeProgramme, Programme } from "./types";
import { vaccination } from "./vaccination";

export const PROGRAMMES: Record<CodeProgramme, Programme> = {
  consultation,
  hypertension,
  grossesse,
  vaccination,
  diabete,
};

export * from "./types";
