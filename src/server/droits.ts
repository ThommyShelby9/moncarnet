import { and, eq } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { Db } from "./db/client";
import { patients, responsables, type LienResponsable, type RoleCompte } from "./db/schema";

const ACCUEILS: Record<RoleCompte, string> = {
  patient: "/",
  relais: "/relais",
  soignant: "/soignant",
  pharmacie: "/pharmacie",
  pilotage: "/pilotage",
  admin: "/admin",
};

export function accueilDuRole(role: RoleCompte): string {
  return ACCUEILS[role];
}

/** Lien du compte avec la personne (« soi », « conjoint »…), ou null s'il ne gère pas son carnet. */
export async function lienAvecPatient(db: Db, compteId: string, patientId: string): Promise<LienResponsable | null> {
  if (!estUuid(patientId)) return null;
  const [ligne] = await db
    .select({ lien: responsables.lien })
    .from(responsables)
    .where(and(eq(responsables.compteId, compteId), eq(responsables.patientId, patientId)))
    .limit(1);
  return ligne?.lien ?? null;
}

/** Vrai si la personne est rattachée à cet établissement : un soignant ne voit que les patients de son centre (spec §12). */
export async function patientDuCentre(db: Db, etablissementId: string | null, patientId: string): Promise<boolean> {
  if (!etablissementId || !estUuid(patientId)) return false;
  const [ligne] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.etablissementId, etablissementId)))
    .limit(1);
  return Boolean(ligne);
}
