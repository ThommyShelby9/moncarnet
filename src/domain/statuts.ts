import type { EtapePlanifiee } from "./calendrier";
import { joursEntre, type DateISO } from "./dates";

export type StatutEtape = "faite" | "a_venir" | "manquee";

export function statutEtape(
  etape: { datePrevue: DateISO; toleranceManqueJours: number },
  faite: boolean,
  aujourdhui: DateISO,
): StatutEtape {
  if (faite) return "faite";
  return joursEntre(etape.datePrevue, aujourdhui) > etape.toleranceManqueJours ? "manquee" : "a_venir";
}

export function compterManquees(etapes: EtapePlanifiee[], codesFaits: ReadonlySet<string>, aujourdhui: DateISO): number {
  return etapes.filter((e) => e.rendezVous && statutEtape(e, codesFaits.has(e.code), aujourdhui) === "manquee").length;
}
