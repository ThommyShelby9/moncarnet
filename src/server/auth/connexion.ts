import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { comptes, type RoleCompte } from "../db/schema";
import { verifier } from "./mots-de-passe";

export const ECHECS_MAX = 5;
export const VERROU_MINUTES = 15;

export type ResultatConnexion =
  | { ok: true; compteId: string; role: RoleCompte }
  | { ok: false; raison: "identifiants" | "verrouille"; jusqua?: Date };

/** Empreinte factice : un compte inconnu coûte le même temps de calcul qu'un compte existant. */
const EMPREINTE_FACTICE = `scrypt$16384$8$1$${"A".repeat(22)}$${"A".repeat(43)}`;

export async function verifierIdentifiants(db: Db, identifiant: string, secret: string, maintenant = new Date()): Promise<ResultatConnexion> {
  const [compte] = await db.select().from(comptes).where(eq(comptes.identifiant, identifiant)).limit(1);
  if (!compte) {
    await verifier(secret, EMPREINTE_FACTICE);
    return { ok: false, raison: "identifiants" };
  }
  if (compte.verrouilleJusqua && compte.verrouilleJusqua > maintenant) {
    return { ok: false, raison: "verrouille", jusqua: compte.verrouilleJusqua };
  }
  if (!(await verifier(secret, compte.empreinteSecret))) {
    const echecs = compte.echecsConnexion + 1;
    const verrou = echecs >= ECHECS_MAX ? new Date(maintenant.getTime() + VERROU_MINUTES * 60_000) : null;
    await db
      .update(comptes)
      .set({ echecsConnexion: verrou ? 0 : echecs, verrouilleJusqua: verrou })
      .where(eq(comptes.id, compte.id));
    return verrou ? { ok: false, raison: "verrouille", jusqua: verrou } : { ok: false, raison: "identifiants" };
  }
  await db.update(comptes).set({ echecsConnexion: 0, verrouilleJusqua: null }).where(eq(comptes.id, compte.id));
  return { ok: true, compteId: compte.id, role: compte.role };
}
