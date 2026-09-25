/** Délai laissé au centre pour prendre une alerte en charge avant qu'elle remonte (spec §4.7). */
export const DELAI_PRISE_EN_CHARGE_MINUTES = 15;

export function echeanceAlerte(creeeLe: Date): Date {
  return new Date(creeeLe.getTime() + DELAI_PRISE_EN_CHARGE_MINUTES * 60_000);
}
