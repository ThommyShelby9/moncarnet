"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { MOMENTS_PRISE } from "@/domain/temps";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { noterPrise } from "@/server/patient/prises";

const champsPrise = z.object({
  patientId: z.uuid(),
  traitementCle: z.string().min(3).max(80),
  moment: z.enum(MOMENTS_PRISE),
  statut: z.enum(["fait", "plus_tard", "annule"]),
  pour: z.string().max(40).optional(),
});

/** « C'est fait », « Plus tard » ou « Annuler » sur une carte de prise ; revient à l'accueil avec la confirmation. */
export async function noterPriseAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("patient");
  const saisie = champsPrise.safeParse(Object.fromEntries(formulaire));
  if (!saisie.success) redirect("/");
  const { pour, ...prise } = saisie.data;
  const resultat = await noterPrise(db(), { compteId: compte.id, ...prise });
  const retour = new URLSearchParams();
  if (pour) retour.set("pour", pour);
  if (resultat.ok) {
    retour.set("note", prise.statut);
    retour.set("carte", `${prise.traitementCle}|${prise.moment}`);
  }
  redirect(`/?${retour}`);
}
