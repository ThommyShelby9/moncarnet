"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { prendreEnCharge } from "@/server/soignant/alertes";
import { exigerSoignant } from "./contexte";

export type EtatFormulaire = { message?: string; valeurs?: Record<string, string> };

/** « Je la prends en charge » : ouvre le dossier pour rappeler tout de suite. */
export async function prendreEnChargeAction(formulaire: FormData): Promise<void> {
  const soignant = await exigerSoignant();
  const resultat = await prendreEnCharge(db(), { auteur: soignant, alerteId: String(formulaire.get("alerteId") ?? "") });
  if (resultat.ok) redirect(`/soignant/patients/${resultat.donnees.patientId}?note=alerte`);
  redirect(`/soignant?note=${resultat.erreur}`);
}
