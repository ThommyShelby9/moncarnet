import { and, eq, inArray } from "drizzle-orm";
import { ageEnAnnees, libelleAge, type DateISO } from "@/domain/dates";
import type { Langue } from "@/domain/langues";
import type { CodeProgramme } from "@/domain/programmes";
import type { Db } from "../db/client";
import { etablissements, inscriptions, patients, responsables, type LienResponsable } from "../db/schema";

export interface Carnet {
  patientId: string;
  prenom: string;
  nom: string;
  lien: LienResponsable;
  sexe: "F" | "M";
  dateNaissance: DateISO;
  age: number;
  libelleAge: string;
  etablissementId: string;
  /** Code écrit dans le carnet papier : le soignant retrouve la personne avec. */
  codeCourt: string;
  /** Programmes de suivi actifs. */
  programmes: CodeProgramme[];
  /** Langue dans laquelle la personne entend les conseils. */
  langue: Langue;
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
      etablissementId: patients.etablissementId,
      codeCourt: patients.codeCourt,
      langue: patients.langue,
    })
    .from(responsables)
    .innerJoin(patients, eq(responsables.patientId, patients.id))
    .where(eq(responsables.compteId, compteId));
  const suivis = lignes.length
    ? await db
        .select({ patientId: inscriptions.patientId, programme: inscriptions.programme })
        .from(inscriptions)
        .where(and(inArray(inscriptions.patientId, lignes.map((l) => l.patientId)), eq(inscriptions.active, true)))
    : [];
  return lignes
    .map((l) => ({
      ...l,
      age: ageEnAnnees(l.dateNaissance, aujourdhui),
      libelleAge: libelleAge(l.dateNaissance, aujourdhui),
      programmes: suivis.filter((s) => s.patientId === l.patientId).map((s) => s.programme),
    }))
    .sort((a, b) => ORDRE[a.lien] - ORDRE[b.lien] || a.prenom.localeCompare(b.prenom, "fr"));
}

/** Carnet affiché : celui demandé s'il fait partie de la famille, sinon celui du titulaire du compte. */
export function choisirCarnet(carnets: Carnet[], demande: string | undefined): Carnet | null {
  return carnets.find((c) => c.patientId === demande) ?? carnets.find((c) => c.lien === "soi") ?? carnets[0] ?? null;
}

export async function etablissementDuPatient(db: Db, patientId: string): Promise<{ nom: string; telephone: string | null } | null> {
  const [ligne] = await db
    .select({ nom: etablissements.nom, telephone: etablissements.telephone })
    .from(patients)
    .innerJoin(etablissements, eq(patients.etablissementId, etablissements.id))
    .where(eq(patients.id, patientId));
  return ligne ?? null;
}
