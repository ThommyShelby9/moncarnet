import { depuisDateISO, joursEntre, type DateISO } from "./dates";

const DECALAGE_BENIN_MS = 60 * 60 * 1000;

/** Heure au Bénin (UTC+1 toute l'année), de 0 à 23. */
export function heureAuBenin(maintenant: Date = new Date()): number {
  return new Date(maintenant.getTime() + DECALAGE_BENIN_MS).getUTCHours();
}

/** Instant de minuit au Bénin pour ce jour-là. */
export function debutDuJourAuBenin(jour: DateISO): Date {
  return new Date(depuisDateISO(jour).getTime() - DECALAGE_BENIN_MS);
}

/** « 9 h 41 », à l'heure du Bénin. */
export function heureMinute(instant: Date): string {
  const local = new Date(instant.getTime() + DECALAGE_BENIN_MS);
  return `${local.getUTCHours()} h ${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

export function salutation(heure: number): "Bonjour" | "Bonsoir" {
  return heure >= 5 && heure < 17 ? "Bonjour" : "Bonsoir";
}

export const MOMENTS_PRISE = ["matin", "midi", "soir"] as const;
export type MomentPrise = (typeof MOMENTS_PRISE)[number];

/** Heure à partir de laquelle chaque prise est attendue. */
const DEBUT_MOMENT: Record<MomentPrise, number> = { matin: 5, midi: 11, soir: 17 };

export function momentCommence(moment: MomentPrise, heure: number): boolean {
  return heure >= DEBUT_MOMENT[moment];
}

export const LIBELLE_MOMENT: Record<MomentPrise, string> = { matin: "Ce matin", midi: "À midi", soir: "Ce soir" };
export const LIBELLE_MOMENT_POSOLOGIE: Record<MomentPrise, string> = { matin: "Le matin", midi: "À midi", soir: "Le soir" };
export const LIBELLE_MOMENT_RDV = { matin: "le matin", apres_midi: "l'après-midi" } as const;

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] as const;

export function majuscule(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase("fr") + texte.slice(1);
}

export function nomDuJour(d: DateISO): string {
  return JOURS[depuisDateISO(d).getUTCDay()]!;
}

/** « mercredi 30 septembre », « jeudi 1er octobre ». */
export function dateLongue(d: DateISO): string {
  const date = depuisDateISO(d);
  const jour = date.getUTCDate();
  return `${JOURS[date.getUTCDay()]} ${jour === 1 ? "1er" : jour} ${MOIS[date.getUTCMonth()]}`;
}

/** « 12/02 », comme sur le carnet papier. */
export function dateCourte(d: DateISO): string {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

/** « mai 2027 », pour une étape encore lointaine. */
export function moisEtAnnee(d: DateISO): string {
  const date = depuisDateISO(d);
  return `${MOIS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function libelleDansJours(n: number): string {
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n < 0) return `il y a ${-n} jours`;
  if (n < 7) return `dans ${n} jours`;
  if (n < 30) {
    const semaines = Math.floor(n / 7);
    return `dans ${semaines} semaine${semaines > 1 ? "s" : ""}`;
  }
  return `dans ${Math.floor(n / 30)} mois`;
}

/** « Aujourd'hui », « Demain », « Mercredi » dans la semaine, puis « Mercredi 7 octobre ». */
export function libelleJour(d: DateISO, aujourdhui: DateISO): string {
  const n = joursEntre(aujourdhui, d);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return "Demain";
  if (n > 1 && n < 7) return majuscule(nomDuJour(d));
  return majuscule(dateLongue(d));
}

/** Les soleils disent dans combien de jours : un par jour d'attente, jusqu'à 6. */
export function nombreDeSoleils(dansJours: number): number {
  return dansJours >= 1 && dansJours <= 6 ? dansJours : 0;
}
