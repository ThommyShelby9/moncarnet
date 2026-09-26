import { and, count, eq, isNull } from "drizzle-orm";
import type { DateISO } from "@/domain/dates";
import type { Db } from "../db/client";
import { alertes, comptes, foyers, passages, patients } from "../db/schema";

export interface EtatDemo {
  comptes: number;
  carnets: number;
  foyers: number;
  alertesEnCours: number;
  enSalleAttente: number;
}

/** Ce que contient la démo, pour l'administration : de quoi savoir si les parcours ont été joués. */
export async function etatDeLaDemo(db: Db, jour: DateISO): Promise<EtatDemo> {
  const [[c], [p], [f], [a], [s]] = await Promise.all([
    db.select({ n: count() }).from(comptes),
    db.select({ n: count() }).from(patients),
    db.select({ n: count() }).from(foyers),
    db.select({ n: count() }).from(alertes).where(and(isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe))),
    db.select({ n: count() }).from(passages).where(and(eq(passages.jour, jour), isNull(passages.appeleLe))),
  ]);
  return { comptes: c?.n ?? 0, carnets: p?.n ?? 0, foyers: f?.n ?? 0, alertesEnCours: a?.n ?? 0, enSalleAttente: s?.n ?? 0 };
}
