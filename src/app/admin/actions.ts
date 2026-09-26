"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { exigerRole, ouvrirSession } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";

/** Remet toute la démo à zéro, pour rejouer les parcours ; en mode démonstration seulement, et après confirmation. */
export async function reinitialiserDemoAction(formulaire: FormData): Promise<void> {
  const admin = await exigerRole("admin");
  if (!env.DEMO_MODE) redirect("/admin?note=hors_demo");
  if (formulaire.get("confirmer") !== "on") redirect("/admin?note=a_confirmer");
  const identifiant = (await db().select({ identifiant: comptes.identifiant }).from(comptes).where(eq(comptes.id, admin.id)))[0]?.identifiant;
  await semerDemo(db(), { aujourdhui: aujourdhuiAuBenin() });
  // La démo recrée tous les comptes (et vide les sessions) : on rouvre celle de l'administrateur.
  const [nouveau] = identifiant ? await db().select({ id: comptes.id }).from(comptes).where(eq(comptes.identifiant, identifiant)) : [];
  if (!nouveau) redirect("/connexion");
  await ouvrirSession(nouveau.id);
  redirect("/admin?note=reinitialisee");
}
