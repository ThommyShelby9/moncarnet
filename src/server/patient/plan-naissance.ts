import { randomUUID } from "node:crypto";
import { evenementSchema } from "@/domain/evenements";
import type { CodePlan } from "@/domain/grossesse";
import type { Db } from "../db/client";
import { evenements } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

/** « Préparer la naissance » : chaque changement est gardé ; le dernier fait foi. */
export async function enregistrerPlanNaissance(
  db: Db,
  e: { compteId: string; patientId: string; elements: CodePlan[]; maintenant?: Date },
): Promise<Resultat<null, "interdit" | "invalide">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  const evenement = evenementSchema.safeParse({ type: "plan_naissance", donnees: { elements: [...new Set(e.elements)] } });
  if (!evenement.success) return echec("invalide");
  await db.insert(evenements).values({
    id: randomUUID(),
    patientId: e.patientId,
    type: "plan_naissance",
    auteurId: e.compteId,
    survenuLe: e.maintenant ?? new Date(),
    donnees: evenement.data.donnees,
  });
  return reussite(null);
}
