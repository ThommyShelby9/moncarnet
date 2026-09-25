import { and, eq, inArray } from "drizzle-orm";
import type { MotifRdv } from "@/domain/programmes";
import type { Db } from "../db/client";
import { comptes, etablissements, evenements } from "../db/schema";

export interface EtapeFaite {
  le: Date;
  /** « Centre de santé de Bohicon », ou « Relais Koffi Agbessi » pour un vaccin fait en tournée. */
  lieu: string;
}

/** Deux programmes peuvent avoir des étapes de même code (« controle-1 ») : la clé porte aussi le motif. */
export function cleEtape(motif: MotifRdv, etape: string): string {
  return `${motif}:${etape}`;
}

/** Étapes de programme faites (consultations et vaccins enregistrés), par personne puis par clé d'étape. */
export async function etapesFaites(db: Db, patientIds: string[]): Promise<Map<string, Map<string, EtapeFaite>>> {
  const resultat = new Map<string, Map<string, EtapeFaite>>();
  if (patientIds.length === 0) return resultat;
  const lignes = await db
    .select({
      patientId: evenements.patientId,
      type: evenements.type,
      donnees: evenements.donnees,
      survenuLe: evenements.survenuLe,
      role: comptes.role,
      auteur: comptes.nomAffiche,
      etablissement: etablissements.nom,
    })
    .from(evenements)
    .leftJoin(comptes, eq(evenements.auteurId, comptes.id))
    .leftJoin(etablissements, eq(comptes.etablissementId, etablissements.id))
    .where(and(inArray(evenements.patientId, patientIds), inArray(evenements.type, ["consultation", "vaccination"])));
  for (const l of lignes) {
    const etape = l.donnees.etape;
    if (typeof etape !== "string") continue;
    const motif = (l.type === "vaccination" ? "vaccin" : l.donnees.motif) as MotifRdv;
    const parPatient = resultat.get(l.patientId) ?? new Map<string, EtapeFaite>();
    parPatient.set(cleEtape(motif, etape), { le: l.survenuLe, lieu: l.role === "relais" ? `Relais ${l.auteur}` : (l.etablissement ?? "") });
    resultat.set(l.patientId, parPatient);
  }
  return resultat;
}
