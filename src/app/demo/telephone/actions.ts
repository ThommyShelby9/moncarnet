"use server";

import { notFound, redirect } from "next/navigation";
import { env } from "@/config/env";
import { db } from "@/server/db/client";
import { repondreRappel } from "@/server/rappels";

/** Réponse « 1 » ou « 2 » tapée sur le faux téléphone de la démo (spec §11). */
export async function repondreDepuisTelephoneAction(formulaire: FormData): Promise<void> {
  if (!env.DEMO_MODE) notFound();
  const numero = String(formulaire.get("numero") ?? "");
  const reponse = formulaire.get("reponse") === "empeche" ? "empeche" : "viendra";
  const resultat = await repondreRappel(db(), { rappelId: String(formulaire.get("rappelId") ?? ""), reponse });
  redirect(`/demo/telephone?numero=${encodeURIComponent(numero)}&note=${resultat.ok ? reponse : "deja"}`);
}
