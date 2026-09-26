import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "./db/client";
import { consignes, evenements, foyers, patients } from "./db/schema";
import { patientDuCentre } from "./droits";
import { echec, reussite, type Resultat } from "./resultat";
import type { Soignant } from "./soignant/consultation";

export const CONSIGNE_MAX = 140;

export interface ConsigneEnCours {
  id: string;
  texte: string;
  creeLe: Date;
}

/** « Passer rappeler la CPN3 » : le soignant confie une visite au relais du foyer ; elle apparaît dans sa tournée. */
export async function confierAuRelais(
  db: Db,
  e: { soignant: Soignant; patientId: string; texte: string; maintenant?: Date },
): Promise<Resultat<{ consigneId: string }, "interdit" | "sans_relais" | "invalide">> {
  const texte = e.texte.trim().replace(/\s+/g, " ");
  if (texte.length < 3 || texte.length > CONSIGNE_MAX) return echec("invalide");
  if (!(await patientDuCentre(db, e.soignant.etablissementId, e.patientId))) return echec("interdit");
  const [foyer] = await db
    .select({ relaisId: foyers.relaisId })
    .from(patients)
    .innerJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(eq(patients.id, e.patientId));
  if (!foyer?.relaisId) return echec("sans_relais");
  const [cree] = await db
    .insert(consignes)
    .values({ patientId: e.patientId, auteurId: e.soignant.id, texte, creeLe: e.maintenant ?? new Date() })
    .returning({ id: consignes.id });
  return reussite({ consigneId: cree!.id });
}

/** Consignes pas encore suivies d'une visite du relais, par personne, la plus ancienne d'abord. */
export async function consignesEnCours(db: Db, patientIds: string[]): Promise<Map<string, ConsigneEnCours[]>> {
  const resultat = new Map<string, ConsigneEnCours[]>();
  if (patientIds.length === 0) return resultat;
  const [lignes, visites] = await Promise.all([
    db
      .select({ id: consignes.id, patientId: consignes.patientId, texte: consignes.texte, creeLe: consignes.creeLe })
      .from(consignes)
      .where(inArray(consignes.patientId, patientIds))
      .orderBy(asc(consignes.creeLe)),
    db
      .select({ patientId: evenements.patientId, le: evenements.survenuLe })
      .from(evenements)
      .where(and(inArray(evenements.patientId, patientIds), eq(evenements.type, "visite_domicile"))),
  ]);
  for (const c of lignes) {
    const faite = visites.some((v) => v.patientId === c.patientId && v.le > c.creeLe);
    if (faite) continue;
    resultat.set(c.patientId, [...(resultat.get(c.patientId) ?? []), { id: c.id, texte: c.texte, creeLe: c.creeLe }]);
  }
  return resultat;
}
