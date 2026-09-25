import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { db } from "../db/client";
import type { RoleCompte } from "../db/schema";
import { accueilDuRole } from "../droits";
import { creerSession, lireSession, supprimerSession, type CompteConnecte } from "./sessions";

export const NOM_COOKIE = "session";

export async function ouvrirSession(compteId: string): Promise<void> {
  const { jeton, expireLe } = await creerSession(db(), compteId);
  (await cookies()).set(NOM_COOKIE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expireLe,
  });
}

export async function compteCourant(): Promise<CompteConnecte | null> {
  const jeton = (await cookies()).get(NOM_COOKIE)?.value;
  return lireSession(db(), jeton);
}

/** Exige une session d'un des rôles donnés ; sinon renvoie vers la connexion ou vers l'espace du rôle. */
export async function exigerRole(...roles: RoleCompte[]): Promise<CompteConnecte> {
  const compte = await compteCourant();
  if (!compte) redirect("/connexion");
  if (!roles.includes(compte.role)) redirect(accueilDuRole(compte.role));
  return compte;
}

export async function fermerSession(): Promise<void> {
  const magasin = await cookies();
  const jeton = magasin.get(NOM_COOKIE)?.value;
  if (jeton) await supprimerSession(db(), jeton);
  magasin.delete(NOM_COOKIE);
}
