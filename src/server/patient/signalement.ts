import { and, eq, isNull } from "drizzle-orm";
import { echeanceAlerte } from "@/domain/alertes";
import { evenementSchema } from "@/domain/evenements";
import { estUuid } from "@/domain/identifiants";
import type { CodeSigne } from "@/domain/signes-danger";
import type { Db } from "../db/client";
import { alertes, evenements, patients } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { etablissementDuPatient } from "../requetes/carnets";
import { echec, reussite, type Resultat } from "../resultat";

export interface AlerteEnvoyee {
  alerteId: string;
  recueLe: Date;
  echeance: Date;
  etablissement: { nom: string; telephone: string | null };
}

type ResultatSignalement = Resultat<AlerteEnvoyee, "interdit" | "invalide">;

/**
 * Enregistre le signe de danger et l'alerte du centre de rattachement, une seule fois par identifiant d'événement.
 * Partagé par le patient (tout de suite) et le relais (au retour du réseau) : les 15 minutes courent dès la réception.
 */
export async function enregistrerSignalement(
  db: Db,
  e: {
    patientId: string;
    evenementId: string;
    auteurId: string;
    signes: CodeSigne[];
    source: "patient" | "relais" | "proche";
    survenuLe: Date;
    maintenant: Date;
  },
): Promise<ResultatSignalement> {
  const evenement = evenementSchema.safeParse({ type: "signalement_danger", donnees: { signes: e.signes, source: e.source } });
  if (!evenement.success || !estUuid(e.evenementId)) return echec("invalide");
  const [patient] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.id, e.patientId));
  const etablissement = await etablissementDuPatient(db, e.patientId);
  if (!patient || !etablissement) return echec("invalide");

  return db.transaction(async (tx): Promise<ResultatSignalement> => {
    const insere = await tx
      .insert(evenements)
      .values({ id: e.evenementId, patientId: e.patientId, type: "signalement_danger", auteurId: e.auteurId, survenuLe: e.survenuLe, donnees: evenement.data.donnees })
      .onConflictDoNothing({ target: evenements.id })
      .returning({ id: evenements.id });
    if (insere.length === 0) {
      // Même signalement renvoyé (double appui, retour du réseau) : on renvoie l'alerte déjà créée.
      const [existante] = await tx.select().from(alertes).where(eq(alertes.evenementId, e.evenementId));
      if (!existante || existante.patientId !== e.patientId) return echec("invalide");
      return reussite({ alerteId: existante.id, recueLe: existante.creeeLe, echeance: existante.echeance, etablissement });
    }
    const [alerte] = await tx
      .insert(alertes)
      .values({ patientId: e.patientId, evenementId: e.evenementId, etablissementId: patient.etablissementId, creeeLe: e.maintenant, echeance: echeanceAlerte(e.maintenant) })
      .returning();
    return reussite({ alerteId: alerte!.id, recueLe: alerte!.creeeLe, echeance: alerte!.echeance, etablissement });
  });
}

/** Signalement fait par la personne ou par un proche qui gère son carnet. */
export async function signalerDanger(
  db: Db,
  e: { compteId: string; patientId: string; evenementId: string; signes: CodeSigne[]; maintenant?: Date },
): Promise<ResultatSignalement> {
  const lien = await lienAvecPatient(db, e.compteId, e.patientId);
  if (!lien) return echec("interdit");
  const maintenant = e.maintenant ?? new Date();
  return enregistrerSignalement(db, {
    patientId: e.patientId,
    evenementId: e.evenementId,
    auteurId: e.compteId,
    signes: e.signes,
    source: lien === "soi" ? "patient" : "proche",
    survenuLe: maintenant,
    maintenant,
  });
}

/** « Je me suis trompé » : possible tant qu'aucun soignant n'a pris l'alerte en charge. */
export async function annulerAlerte(
  db: Db,
  e: { compteId: string; alerteId: string; maintenant?: Date },
): Promise<Resultat<null, "interdit" | "introuvable" | "deja_prise_en_charge">> {
  if (!estUuid(e.alerteId)) return echec("introuvable");
  const [alerte] = await db.select().from(alertes).where(eq(alertes.id, e.alerteId));
  if (!alerte) return echec("introuvable");
  if (!(await lienAvecPatient(db, e.compteId, alerte.patientId))) return echec("interdit");
  if (alerte.priseEnChargeLe) return echec("deja_prise_en_charge");
  await db
    .update(alertes)
    .set({ annuleeLe: e.maintenant ?? new Date() })
    .where(and(eq(alertes.id, alerte.id), isNull(alertes.annuleeLe)));
  return reussite(null);
}
