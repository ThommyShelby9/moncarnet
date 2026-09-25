import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { LigneTraitement } from "@/domain/traitements";
import type { Db } from "../db/client";
import { comptes, evenements, ordonnances, patients } from "../db/schema";
import { ordonnancesDe } from "../requetes/ordonnances";
import { echec, reussite, type Resultat } from "../resultat";

export interface OrdonnancePourPharmacie {
  id: string;
  codeRetrait: string;
  /** Juste de quoi remettre les médicaments à la bonne personne : jamais le dossier (spec §12). */
  patient: { prenom: string; nom: string; anneeNaissance: number };
  prescripteur: string;
  emiseLe: Date;
  lignes: LigneTraitement[];
  delivrance: { le: Date; par: string } | null;
}

export async function ordonnanceParCode(db: Db, code: string): Promise<OrdonnancePourPharmacie | null> {
  const [o] = await db
    .select({
      id: ordonnances.id,
      codeRetrait: ordonnances.codeRetrait,
      emiseLe: ordonnances.emiseLe,
      lignes: ordonnances.lignes,
      patientId: ordonnances.patientId,
      prenom: patients.prenom,
      nom: patients.nom,
      dateNaissance: patients.dateNaissance,
      prescripteur: comptes.nomAffiche,
    })
    .from(ordonnances)
    .innerJoin(patients, eq(ordonnances.patientId, patients.id))
    .innerJoin(comptes, eq(ordonnances.prescripteurId, comptes.id))
    .where(eq(ordonnances.codeRetrait, code))
    .limit(1);
  if (!o) return null;
  const detail = (await ordonnancesDe(db, o.patientId)).find((x) => x.id === o.id);
  return {
    id: o.id,
    codeRetrait: o.codeRetrait,
    patient: { prenom: o.prenom, nom: o.nom, anneeNaissance: Number(o.dateNaissance.slice(0, 4)) },
    prescripteur: o.prescripteur,
    emiseLe: o.emiseLe,
    lignes: o.lignes,
    delivrance: detail?.delivrance ?? null,
  };
}

/** « Délivrance confirmée » : une seule fois par ordonnance ; les prises arrivent alors dans le carnet du patient. */
export async function delivrer(
  db: Db,
  e: { auteurId: string; ordonnanceId: string; maintenant?: Date },
): Promise<Resultat<{ delivreeLe: Date }, "introuvable" | "deja_delivree">> {
  if (!estUuid(e.ordonnanceId)) return echec("introuvable");
  const maintenant = e.maintenant ?? new Date();
  return db.transaction(async (tx): Promise<Resultat<{ delivreeLe: Date }, "introuvable" | "deja_delivree">> => {
    // Verrou sur l'ordonnance : deux appuis simultanés passent l'un après l'autre.
    const [o] = await tx
      .select({ id: ordonnances.id, patientId: ordonnances.patientId })
      .from(ordonnances)
      .where(eq(ordonnances.id, e.ordonnanceId))
      .for("update");
    if (!o) return echec("introuvable");
    const deja = await tx
      .select({ id: evenements.id })
      .from(evenements)
      .where(and(eq(evenements.patientId, o.patientId), eq(evenements.type, "delivrance"), sql`${evenements.donnees}->>'ordonnanceId' = ${o.id}`))
      .limit(1);
    if (deja.length > 0) return echec("deja_delivree");
    await tx.insert(evenements).values({
      id: randomUUID(),
      patientId: o.patientId,
      type: "delivrance",
      auteurId: e.auteurId,
      survenuLe: maintenant,
      donnees: { ordonnanceId: o.id },
    });
    return reussite({ delivreeLe: maintenant });
  });
}
