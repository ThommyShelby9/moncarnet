"use server";

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { env } from "@/config/env";
import { ouvrirSession } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { COMPTES_DEMO } from "@/server/demo/donnees";
import { accueilDuRole } from "@/server/droits";

export async function entrerCommeDemo(fd: FormData): Promise<void> {
  if (!env.DEMO_MODE) notFound();
  const identifiant = String(fd.get("identifiant") ?? "");
  if (!COMPTES_DEMO.some((c) => c.identifiant === identifiant)) notFound();
  const [compte] = await db().select().from(comptes).where(eq(comptes.identifiant, identifiant)).limit(1);
  if (!compte) redirect("/demo?erreur=base-vide");
  await ouvrirSession(compte.id);
  redirect(accueilDuRole(compte.role));
}
