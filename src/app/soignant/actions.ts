"use server";

import { redirect } from "next/navigation";
import { lireSaisieConsultation } from "@/domain/consultation";
import { lireLignes } from "@/domain/ordonnances";
import { db } from "@/server/db/client";
import { prendreEnCharge } from "@/server/soignant/alertes";
import { enregistrerConsultation } from "@/server/soignant/consultation";
import { emettreOrdonnance } from "@/server/soignant/ordonnance";
import { exigerSoignant } from "./contexte";

export type EtatFormulaire = { message?: string; valeurs?: Record<string, string> };

/** « Je la prends en charge » : ouvre le dossier pour rappeler tout de suite. */
export async function prendreEnChargeAction(formulaire: FormData): Promise<void> {
  const soignant = await exigerSoignant();
  const resultat = await prendreEnCharge(db(), { auteur: soignant, alerteId: String(formulaire.get("alerteId") ?? "") });
  if (resultat.ok) redirect(`/soignant/patients/${resultat.donnees.patientId}?note=alerte`);
  redirect(`/soignant?note=${resultat.erreur}`);
}

const texteDu = (formulaire: FormData): Record<string, string> =>
  Object.fromEntries([...formulaire.entries()].filter(([cle]) => !cle.startsWith("$")).map(([cle, valeur]) => [cle, String(valeur)]));

export async function enregistrerConsultationAction(_: EtatFormulaire, formulaire: FormData): Promise<EtatFormulaire> {
  const soignant = await exigerSoignant();
  const valeurs = texteDu(formulaire);
  const lecture = lireSaisieConsultation(valeurs);
  if (!lecture.ok) return { message: lecture.message, valeurs };
  const resultat = await enregistrerConsultation(db(), { auteur: soignant, patientId: valeurs.patientId ?? "", saisie: lecture.saisie });
  if (!resultat.ok) {
    const message = resultat.erreur === "interdit" ? "Ce patient n'est pas suivi dans votre centre." : "Cette étape ne va pas avec le motif choisi.";
    return { message, valeurs };
  }
  redirect(`/soignant/patients/${valeurs.patientId}?note=consultation`);
}

export async function emettreOrdonnanceAction(_: EtatFormulaire, formulaire: FormData): Promise<EtatFormulaire> {
  const soignant = await exigerSoignant();
  const valeurs = texteDu(formulaire);
  const lecture = lireLignes(valeurs);
  if (!lecture.ok) return { message: lecture.message, valeurs };
  const resultat = await emettreOrdonnance(db(), { auteur: soignant, patientId: valeurs.patientId ?? "", lignes: lecture.lignes });
  if (!resultat.ok) {
    const message = resultat.erreur === "interdit" ? "Ce patient n'est pas suivi dans votre centre." : "Le code de retrait n'a pas pu être créé. Réessayez.";
    return { message, valeurs };
  }
  redirect(`/soignant/patients/${valeurs.patientId}?note=ordonnance&code=${resultat.donnees.codeRetrait}`);
}
