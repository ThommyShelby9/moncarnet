"use server";

import { redirect } from "next/navigation";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { delivrer } from "@/server/pharmacie/delivrance";
import { finirRupture, signalerRupture } from "@/server/pharmacie/ruptures";

export async function delivrerAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("pharmacie");
  const code = String(formulaire.get("code") ?? "");
  const resultat = await delivrer(db(), { auteurId: compte.id, ordonnanceId: String(formulaire.get("ordonnanceId") ?? "") });
  redirect(`/pharmacie?${new URLSearchParams({ code, ...(resultat.ok ? { note: "delivree" } : {}) })}`);
}

/** « Ce médicament manque » : les soignants le voient avant de prescrire. */
export async function signalerRuptureAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("pharmacie");
  const resultat = await signalerRupture(db(), { compte, medicament: String(formulaire.get("medicament") ?? "") });
  redirect(`/pharmacie/ruptures?note=${resultat.ok ? "signalee" : resultat.erreur}`);
}

/** « De nouveau disponible ». */
export async function finirRuptureAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("pharmacie");
  const resultat = await finirRupture(db(), { compte, ruptureId: String(formulaire.get("ruptureId") ?? "") });
  redirect(`/pharmacie/ruptures?note=${resultat.ok ? "finie" : resultat.erreur}`);
}
