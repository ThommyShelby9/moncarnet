import { and, desc, eq } from "drizzle-orm";
import type { LigneTraitement } from "@/domain/traitements";
import type { Db } from "../db/client";
import { comptes, evenements, ordonnances } from "../db/schema";

export interface OrdonnanceDetaillee {
  id: string;
  codeRetrait: string;
  emiseLe: Date;
  prescripteur: string;
  lignes: LigneTraitement[];
  delivrance: { le: Date; par: string } | null;
}

/** Ordonnances d'une personne, la plus récente d'abord, avec leur délivrance (tampon côté soignant). */
export async function ordonnancesDe(db: Db, patientId: string): Promise<OrdonnanceDetaillee[]> {
  const [lesOrdonnances, delivrances] = await Promise.all([
    db
      .select({ id: ordonnances.id, codeRetrait: ordonnances.codeRetrait, emiseLe: ordonnances.emiseLe, lignes: ordonnances.lignes, prescripteur: comptes.nomAffiche })
      .from(ordonnances)
      .innerJoin(comptes, eq(ordonnances.prescripteurId, comptes.id))
      .where(eq(ordonnances.patientId, patientId))
      .orderBy(desc(ordonnances.emiseLe)),
    db
      .select({ donnees: evenements.donnees, le: evenements.survenuLe, par: comptes.nomAffiche })
      .from(evenements)
      .leftJoin(comptes, eq(evenements.auteurId, comptes.id))
      .where(and(eq(evenements.patientId, patientId), eq(evenements.type, "delivrance"))),
  ]);
  return lesOrdonnances.map((o) => {
    const d = delivrances.find((x) => x.donnees.ordonnanceId === o.id);
    return { ...o, delivrance: d ? { le: d.le, par: d.par ?? "" } : null };
  });
}
