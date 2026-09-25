import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "../db/client";
import { comptes, sessions, type RoleCompte } from "../db/schema";

export const DUREE_SESSION_JOURS = 30;

export interface CompteConnecte {
  id: string;
  role: RoleCompte;
  nomAffiche: string;
  etablissementId: string | null;
  communeId: string | null;
}

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export async function creerSession(db: Db, compteId: string, maintenant = new Date()) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(maintenant.getTime() + DUREE_SESSION_JOURS * 86_400_000);
  await db.insert(sessions).values({ id: empreinte(jeton), compteId, expireLe });
  return { jeton, expireLe };
}

export async function lireSession(db: Db, jeton: string | undefined, maintenant = new Date()): Promise<CompteConnecte | null> {
  if (!jeton) return null;
  const [ligne] = await db
    .select({
      id: comptes.id,
      role: comptes.role,
      nomAffiche: comptes.nomAffiche,
      etablissementId: comptes.etablissementId,
      communeId: comptes.communeId,
    })
    .from(sessions)
    .innerJoin(comptes, eq(sessions.compteId, comptes.id))
    .where(and(eq(sessions.id, empreinte(jeton)), gt(sessions.expireLe, maintenant)))
    .limit(1);
  return ligne ?? null;
}

export async function supprimerSession(db: Db, jeton: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, empreinte(jeton)));
}
