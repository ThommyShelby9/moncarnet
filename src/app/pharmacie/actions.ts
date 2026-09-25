"use server";

import { redirect } from "next/navigation";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { delivrer } from "@/server/pharmacie/delivrance";

export async function delivrerAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("pharmacie");
  const code = String(formulaire.get("code") ?? "");
  const resultat = await delivrer(db(), { auteurId: compte.id, ordonnanceId: String(formulaire.get("ordonnanceId") ?? "") });
  redirect(`/pharmacie?${new URLSearchParams({ code, ...(resultat.ok ? { note: "delivree" } : {}) })}`);
}
