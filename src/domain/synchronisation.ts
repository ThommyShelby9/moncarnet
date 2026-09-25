import { z } from "zod";

/** Une saisie de la file d'envoi, telle qu'elle arrive du téléphone. */
export const evenementEntrantSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  type: z.string().min(1).max(40),
  survenuLe: z.iso.datetime({ offset: true }),
  donnees: z.record(z.string(), z.unknown()),
});
export type EvenementEntrant = z.infer<typeof evenementEntrantSchema>;

export type StatutSync = "accepte" | "deja_recu" | "refuse";

/** Réponse pour chaque saisie : rien n'est perdu en silence (spec §10.2). */
export interface ResultatSync {
  id: string;
  statut: StatutSync;
  motif?: string;
}

export const MAX_LOT = 100;

/** Une saisie datée du futur (plus de 5 minutes) ou de plus de 30 jours vient d'une horloge fausse. */
export function dateAcceptable(survenuLe: Date, maintenant: Date): boolean {
  const ecart = survenuLe.getTime() - maintenant.getTime();
  return ecart <= 5 * 60_000 && ecart >= -30 * 86_400_000;
}
