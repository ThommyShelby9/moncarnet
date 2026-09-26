"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { exigerRole, ouvrirSession } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { envoyerRappels, relancer } from "@/server/rappels";
import { modifierTexte } from "@/server/contenus";
import { estLangue } from "@/domain/langues";

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

/** Démo : envoie les rappels des places réservées dans 2 jours (canaux simulés). */
export async function envoyerRappelsAction(): Promise<void> {
  await exigerRole("admin");
  const maintenant = new Date();
  const { envoyes } = await envoyerRappels(db(), { maintenant, aujourdhui: aujourdhuiAuBenin(maintenant) });
  redirect(`/admin?note=rappels&nombre=${envoyes}`);
}

/** Démo : relance tout de suite les rappels restés sans réponse sur le canal suivant (en vrai, après 2 heures). */
export async function relancerRappelsAction(): Promise<void> {
  await exigerRole("admin");
  const { relances } = await relancer(db(), { maintenant: new Date(), delaiMinutes: 0 });
  redirect(`/admin?note=relances&nombre=${relances}`);
}

/** Texte d'un contenu de santé, dans une langue. */
export async function modifierTexteAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("admin");
  const code = String(formulaire.get("code") ?? "");
  const langue = String(formulaire.get("langue") ?? "");
  const resultat = estLangue(langue)
    ? await modifierTexte(db(), { compte, code, langue, texte: String(formulaire.get("texte") ?? "") })
    : ({ ok: false, erreur: "invalide" } as const);
  redirect(`/admin/contenus?note=${resultat.ok ? "texte" : resultat.erreur}#${encodeURIComponent(code)}`);
}
