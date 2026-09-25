import { and, eq, isNull } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { Db } from "../db/client";
import { alertes } from "../db/schema";
import { echec, reussite, type Resultat } from "../resultat";
import type { Soignant } from "./consultation";

/** « Je la prends en charge » : le premier soignant du centre qui touche le bouton prend l'alerte. */
export async function prendreEnCharge(
  db: Db,
  e: { auteur: Soignant; alerteId: string; maintenant?: Date },
): Promise<Resultat<{ patientId: string }, "introuvable" | "annulee" | "deja_prise">> {
  if (!estUuid(e.alerteId) || !e.auteur.etablissementId) return echec("introuvable");
  const [alerte] = await db
    .select()
    .from(alertes)
    .where(and(eq(alertes.id, e.alerteId), eq(alertes.etablissementId, e.auteur.etablissementId)));
  if (!alerte) return echec("introuvable");
  if (alerte.annuleeLe) return echec("annulee");
  const prises = await db
    .update(alertes)
    .set({ priseEnChargePar: e.auteur.id, priseEnChargeLe: e.maintenant ?? new Date() })
    .where(and(eq(alertes.id, alerte.id), isNull(alertes.priseEnChargeLe)))
    .returning({ id: alertes.id });
  if (prises.length === 0) return echec("deja_prise");
  return reussite({ patientId: alerte.patientId });
}
