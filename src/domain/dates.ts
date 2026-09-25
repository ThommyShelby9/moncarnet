/** Date sans heure, au format AAAA-MM-JJ, calculée en UTC. */
export type DateISO = string;

const MS_PAR_JOUR = 86_400_000;
const FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export function versDateISO(date: Date): DateISO {
  return date.toISOString().slice(0, 10);
}

export function depuisDateISO(d: DateISO): Date {
  if (!FORMAT.test(d)) throw new Error(`Date invalide : ${d}`);
  const date = new Date(`${d}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || versDateISO(date) !== d) throw new Error(`Date invalide : ${d}`);
  return date;
}

export function ajouterJours(d: DateISO, jours: number): DateISO {
  return versDateISO(new Date(depuisDateISO(d).getTime() + jours * MS_PAR_JOUR));
}

export function joursEntre(de: DateISO, a: DateISO): number {
  return Math.round((depuisDateISO(a).getTime() - depuisDateISO(de).getTime()) / MS_PAR_JOUR);
}

function moisEntre(naissance: Date, le: Date): number {
  let mois = (le.getUTCFullYear() - naissance.getUTCFullYear()) * 12 + (le.getUTCMonth() - naissance.getUTCMonth());
  if (le.getUTCDate() < naissance.getUTCDate()) mois -= 1;
  return mois;
}

export function ageEnAnnees(naissance: DateISO, le: DateISO): number {
  return Math.floor(moisEntre(depuisDateISO(naissance), depuisDateISO(le)) / 12);
}

export function libelleAge(naissance: DateISO, le: DateISO): string {
  const mois = moisEntre(depuisDateISO(naissance), depuisDateISO(le));
  if (mois < 1) return "moins d'un mois";
  if (mois < 24) return `${mois} mois`;
  return `${Math.floor(mois / 12)} ans`;
}

/** Le Bénin est à UTC+1 toute l'année (pas d'heure d'été). */
export function aujourdhuiAuBenin(maintenant: Date = new Date()): DateISO {
  return versDateISO(new Date(maintenant.getTime() + 60 * 60 * 1000));
}
