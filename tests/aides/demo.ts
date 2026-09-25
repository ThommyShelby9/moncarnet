import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { comptes, patients } from "@/server/db/schema";

export const COMPTE = { codjo: "+2290197000001", awa: "+2290197000002", aicha: "+2290197000004" } as const;

export async function idCompte(db: Db, identifiant: string): Promise<string> {
  const [compte] = await db.select({ id: comptes.id }).from(comptes).where(eq(comptes.identifiant, identifiant));
  if (!compte) throw new Error(`Compte de démo introuvable : ${identifiant}`);
  return compte.id;
}

/** Personnages de la démo dont le prénom est unique : Codjo, Mariam, Sèna, Awa, Aïcha, Rachida. */
export async function idPatient(db: Db, prenom: string): Promise<string> {
  const lignes = await db.select({ id: patients.id }).from(patients).where(eq(patients.prenom, prenom));
  if (lignes.length !== 1) throw new Error(`Prénom de démo ambigu ou introuvable : ${prenom}`);
  return lignes[0]!.id;
}
