/** Délai laissé au centre pour prendre une alerte en charge avant qu'elle remonte (spec §4.7). */
export const DELAI_PRISE_EN_CHARGE_MINUTES = 15;

export function echeanceAlerte(creeeLe: Date): Date {
  return new Date(creeeLe.getTime() + DELAI_PRISE_EN_CHARGE_MINUTES * 60_000);
}

export type StatutAlerte = "en_attente" | "en_retard" | "prise_en_charge" | "annulee";

export function statutAlerte(
  alerte: { echeance: Date; priseEnChargeLe: Date | null; annuleeLe: Date | null },
  maintenant: Date,
): StatutAlerte {
  if (alerte.annuleeLe) return "annulee";
  if (alerte.priseEnChargeLe) return "prise_en_charge";
  return maintenant.getTime() > alerte.echeance.getTime() ? "en_retard" : "en_attente";
}

/** Minutes entières avant l'échéance ; négatif quand le délai est dépassé. */
export function minutesRestantes(echeance: Date, maintenant: Date): number {
  return Math.ceil((echeance.getTime() - maintenant.getTime()) / 60_000);
}
