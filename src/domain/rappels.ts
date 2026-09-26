import type { DateISO } from "./dates";
import { dateLongue, LIBELLE_MOMENT_RDV } from "./temps";

/** La cascade de la spec §4.3 : WhatsApp, puis SMS, puis appel vocal, puis le relais du village. */
export const CANAUX_RAPPEL = ["whatsapp", "sms", "vocal", "relais"] as const;
export type CanalRappel = (typeof CANAUX_RAPPEL)[number];

export const LIBELLES_CANAL: Record<CanalRappel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  vocal: "Appel vocal",
  relais: "Relais",
};

/** Premier canal : celui que la personne préfère, s'il est possible ; sans téléphone, c'est le relais qui passe. */
export function premierCanal(p: { canalPrefere: CanalRappel; telephone: string | null; consentements: string[] }): CanalRappel {
  if (!p.telephone || p.canalPrefere === "relais") return "relais";
  if (p.canalPrefere === "vocal") return "vocal";
  if (p.canalPrefere === "whatsapp" && p.consentements.includes("whatsapp")) return "whatsapp";
  return "sms";
}

export function canalSuivant(canal: CanalRappel): CanalRappel | null {
  return CANAUX_RAPPEL[CANAUX_RAPPEL.indexOf(canal) + 1] ?? null;
}

/**
 * Texte du rappel : qui, « vaccin » ou « rendez-vous », quand et où. Jamais la maladie : le téléphone peut être partagé (spec §11).
 */
export function texteRappel(r: { pour: string | null; vaccin: boolean; date: DateISO; moment: "matin" | "apres_midi" | null; centre: string; canal: CanalRappel }): string {
  const quand = `${dateLongue(r.date)}${r.moment ? `, ${LIBELLE_MOMENT_RDV[r.moment]}` : ""}`;
  const quoi = r.vaccin ? "vaccin" : "rendez-vous";
  if (r.canal === "vocal") {
    const qui = r.pour ? `${r.pour} a ${r.vaccin ? "un vaccin" : "rendez-vous"}` : `Vous avez ${r.vaccin ? "un vaccin" : "rendez-vous"}`;
    return `Bonjour. ${qui} ${quand}, au ${r.centre}. Tapez 1 si vous venez, 2 si vous ne pouvez pas.`;
  }
  const debut = r.pour ? `Rappel pour ${r.pour} : ${quoi}` : `Rappel : ${quoi}`;
  return `${debut} ${quand}, au ${r.centre}. Répondez 1 si vous venez, 2 si vous ne pouvez pas.`;
}
