import { eq } from "drizzle-orm";
import { ageEnAnnees, libelleAge, type DateISO } from "@/domain/dates";
import type { Db } from "../db/client";
import { patients, responsables, type LienResponsable } from "../db/schema";

export interface Carnet {
  patientId: string;
  prenom: string;
  nom: string;
  lien: LienResponsable;
  sexe: "F" | "M";
  dateNaissance: DateISO;
  age: number;
  libelleAge: string;
}

const ORDRE: Record<LienResponsable, number> = { soi: 0, conjoint: 1, parent: 2, enfant: 3, aidant: 4 };

export async function carnetsDuCompte(db: Db, compteId: string, aujourdhui: DateISO): Promise<Carnet[]> {
  const lignes = await db
    .select({
      patientId: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      lien: responsables.lien,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
    })
    .from(responsables)
    .innerJoin(patients, eq(responsables.patientId, patients.id))
    .where(eq(responsables.compteId, compteId));
  return lignes
    .map((l) => ({ ...l, age: ageEnAnnees(l.dateNaissance, aujourdhui), libelleAge: libelleAge(l.dateNaissance, aujourdhui) }))
    .sort((a, b) => ORDRE[a.lien] - ORDRE[b.lien] || a.prenom.localeCompare(b.prenom, "fr"));
}
