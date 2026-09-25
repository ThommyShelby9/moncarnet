"use server";

import { redirect } from "next/navigation";
import { verifierIdentifiants } from "@/server/auth/connexion";
import { ouvrirSession } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { accueilDuRole } from "@/server/droits";
import { lireConnexionPatient, lireConnexionPersonnel, messageEchec, type EtatFormulaire } from "./formulaires";

export async function connecterPatient(_: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const saisie = lireConnexionPatient(fd);
  if (!saisie.ok) return { message: saisie.message };
  const resultat = await verifierIdentifiants(db(), saisie.identifiant, saisie.code);
  if (!resultat.ok) return { message: messageEchec(resultat.raison, resultat.jusqua, "patient") };
  if (resultat.role !== "patient") return { message: "Ce compte est un compte professionnel. Utilisez l'accès des professionnels." };
  await ouvrirSession(resultat.compteId);
  redirect("/");
}

export async function connecterPersonnel(_: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const saisie = lireConnexionPersonnel(fd);
  if (!saisie.ok) return { message: saisie.message };
  const resultat = await verifierIdentifiants(db(), saisie.identifiant, saisie.motDePasse);
  if (!resultat.ok) return { message: messageEchec(resultat.raison, resultat.jusqua, "personnel") };
  if (resultat.role === "patient") return { message: "Ce compte est un compte patient. Utilisez l'accès « Mon carnet »." };
  await ouvrirSession(resultat.compteId);
  redirect(accueilDuRole(resultat.role));
}
