import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import type { SaisieConsultation } from "@/domain/consultation";
import { evenementSchema, type EvenementValide } from "@/domain/evenements";
import { PROGRAMMES } from "@/domain/programmes";
import type { Db } from "../db/client";
import { evenements, inscriptions } from "../db/schema";
import { patientDuCentre } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

export interface Soignant {
  id: string;
  etablissementId: string | null;
}

/** Consultation (ou vaccination) saisie par un soignant ; une étape de programme doit aller avec le motif. */
export async function enregistrerConsultation(
  db: Db,
  e: { auteur: Soignant; patientId: string; saisie: SaisieConsultation; maintenant?: Date },
): Promise<Resultat<{ evenementId: string }, "interdit" | "etape_inconnue">> {
  if (!(await patientDuCentre(db, e.auteur.etablissementId, e.patientId))) return echec("interdit");
  const { motif, etape: codeEtape, mesures, notes } = e.saisie;
  let evenement: EvenementValide;
  if (codeEtape) {
    const lesInscriptions = await db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.patientId, e.patientId), eq(inscriptions.active, true)));
    const etape = lesInscriptions
      .flatMap((i) => planifier(PROGRAMMES[i.programme], i.dateReference, i.dateInscription))
      .find((x) => x.code === codeEtape && x.motif === motif);
    if (!etape) return echec("etape_inconnue");
    evenement =
      etape.motif === "vaccin"
        ? evenementSchema.parse({ type: "vaccination", donnees: { etape: etape.code, vaccins: (etape.details ?? etape.libelle).split(", ") } })
        : evenementSchema.parse({ type: "consultation", donnees: { motif, etape: etape.code, mesures, notes } });
  } else {
    evenement = evenementSchema.parse({ type: "consultation", donnees: { motif, mesures, notes } });
  }
  const evenementId = randomUUID();
  await db.insert(evenements).values({
    id: evenementId,
    patientId: e.patientId,
    type: evenement.type,
    auteurId: e.auteur.id,
    survenuLe: e.maintenant ?? new Date(),
    donnees: evenement.donnees,
  });
  return reussite({ evenementId });
}
