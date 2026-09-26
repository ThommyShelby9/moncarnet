import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { patients } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

const PRENOM_EN_ATTENTE = "Bébé";
const prenomSchema = z.string().trim().min(1).max(60);

/** Le prénom est souvent donné quelques jours après la naissance, lors de la sortie de l'enfant : la famille le donne depuis le carnet. */
export async function nommerEnfant(
  db: Db,
  e: { compteId: string; patientId: string; prenom: string },
): Promise<Resultat<{ prenom: string }, "interdit" | "deja_nomme" | "invalide">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  const lecture = prenomSchema.safeParse(e.prenom);
  if (!lecture.success) return echec("invalide");
  const change = await db
    .update(patients)
    .set({ prenom: lecture.data })
    .where(and(eq(patients.id, e.patientId), eq(patients.prenom, PRENOM_EN_ATTENTE)))
    .returning({ id: patients.id });
  return change.length ? reussite({ prenom: lecture.data }) : echec("deja_nomme");
}
