import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { evenementSchema } from "@/domain/evenements";
import { estUuid } from "@/domain/identifiants";
import type { MomentPrise } from "@/domain/temps";
import type { StatutPrise } from "@/domain/traitements";
import type { Db } from "../db/client";
import { evenements, ordonnances } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

/** Note « C'est fait », « Plus tard » ou « Annuler » pour une prise de médicament. */
export async function noterPrise(
  db: Db,
  e: { compteId: string; patientId: string; traitementCle: string; moment: MomentPrise; statut: StatutPrise; maintenant?: Date },
): Promise<Resultat<null, "interdit" | "introuvable">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  const [ordonnanceId, index] = e.traitementCle.split(":");
  if (!estUuid(ordonnanceId)) return echec("introuvable");
  const [ordonnance] = await db
    .select({ patientId: ordonnances.patientId, lignes: ordonnances.lignes })
    .from(ordonnances)
    .where(eq(ordonnances.id, ordonnanceId));
  if (!ordonnance || ordonnance.patientId !== e.patientId || !ordonnance.lignes[Number(index)]) return echec("introuvable");
  const evenement = evenementSchema.parse({
    type: "prise_medicament",
    donnees: { traitement: e.traitementCle, moment: e.moment, statut: e.statut },
  });
  await db.insert(evenements).values({
    id: randomUUID(),
    patientId: e.patientId,
    type: evenement.type,
    auteurId: e.compteId,
    survenuLe: e.maintenant ?? new Date(),
    donnees: evenement.donnees,
  });
  return reussite(null);
}
