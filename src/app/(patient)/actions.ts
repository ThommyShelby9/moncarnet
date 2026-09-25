"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { MOTIFS_RDV } from "@/domain/programmes";
import { MOMENTS_PRISE } from "@/domain/temps";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { noterPrise } from "@/server/patient/prises";
import { inscrireListeAttente, reserver } from "@/server/patient/reservation";

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

const champsReservation = z.object({ patientId: z.uuid(), motif: z.enum(MOTIFS_RDV), creneauId: z.uuid() });

/** Réserve la place choisie ; si elle vient d'être prise, revient au choix du jour avec le motif du refus. */
export async function reserverAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("patient");
  const saisie = champsReservation.safeParse(Object.fromEntries(formulaire));
  if (!saisie.success) redirect("/prendre-rendez-vous");
  const resultat = await reserver(db(), { compteId: compte.id, ...saisie.data, aujourdhui: aujourdhuiAuBenin() });
  if (resultat.ok) redirect(`/prendre-rendez-vous?fait=${resultat.donnees.rendezVousId}`);
  redirect(`/prendre-rendez-vous?pour=${saisie.data.patientId}&motif=${saisie.data.motif}&erreur=${resultat.erreur}`);
}

/** Inscrit sur la liste d'attente d'un jour complet. */
export async function listeAttenteAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("patient");
  const saisie = champsReservation.safeParse(Object.fromEntries(formulaire));
  if (!saisie.success) redirect("/prendre-rendez-vous");
  const resultat = await inscrireListeAttente(db(), { compteId: compte.id, ...saisie.data });
  if (resultat.ok) redirect(`/prendre-rendez-vous?attente=${resultat.donnees.attenteId}`);
  redirect(`/prendre-rendez-vous?pour=${saisie.data.patientId}&motif=${saisie.data.motif}&erreur=${resultat.erreur}`);
}
