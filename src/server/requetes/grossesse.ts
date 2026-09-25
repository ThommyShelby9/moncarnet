import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { aujourdhuiAuBenin, type DateISO } from "@/domain/dates";
import type { CodePlan } from "@/domain/grossesse";
import type { Db } from "../db/client";
import { evenements, inscriptions, patients } from "../db/schema";

/** Grossesse en cours : la date des dernières règles, ou null. */
export async function grossesseDe(db: Db, patientId: string): Promise<{ ddr: DateISO } | null> {
  const [g] = await db
    .select({ ddr: inscriptions.dateReference })
    .from(inscriptions)
    .where(and(eq(inscriptions.patientId, patientId), eq(inscriptions.programme, "grossesse"), eq(inscriptions.active, true)));
  return g ?? null;
}

export async function planNaissanceDe(db: Db, patientId: string): Promise<CodePlan[]> {
  const [dernier] = await db
    .select({ donnees: evenements.donnees })
    .from(evenements)
    .where(and(eq(evenements.patientId, patientId), eq(evenements.type, "plan_naissance")))
    .orderBy(desc(evenements.survenuLe), desc(evenements.recuLe))
    .limit(1);
  return (dernier?.donnees.elements as CodePlan[] | undefined) ?? [];
}

/** Naissances déclarées depuis une date, pour féliciter la famille sur l'accueil. */
export async function naissancesRecentes(
  db: Db,
  meres: string[],
  depuis: Date,
): Promise<{ mereId: string; bebeId: string; prenom: string; sexe: "F" | "M"; le: Date }[]> {
  if (meres.length === 0) return [];
  const lignes = await db
    .select({ mereId: evenements.patientId, donnees: evenements.donnees, le: evenements.survenuLe })
    .from(evenements)
    .where(and(inArray(evenements.patientId, meres), eq(evenements.type, "accouchement"), gte(evenements.survenuLe, depuis)));
  const bebeIds = lignes.map((l) => (l.donnees.enfant as { id: string }).id);
  const bebes = bebeIds.length ? await db.select({ id: patients.id, prenom: patients.prenom, sexe: patients.sexe }).from(patients).where(inArray(patients.id, bebeIds)) : [];
  return lignes.flatMap((l) => {
    const bebe = bebes.find((b) => b.id === (l.donnees.enfant as { id: string }).id);
    return bebe ? [{ mereId: l.mereId, bebeId: bebe.id, prenom: bebe.prenom, sexe: bebe.sexe, le: l.le }] : [];
  });
}

/** Relevés de tension (consultations et relevés), les 8 derniers, du plus ancien au plus récent. */
export async function tensionsDe(db: Db, patientId: string): Promise<{ date: DateISO; sys: number; dia: number }[]> {
  const lignes = await db
    .select({ donnees: evenements.donnees, le: evenements.survenuLe })
    .from(evenements)
    .where(and(eq(evenements.patientId, patientId), inArray(evenements.type, ["consultation", "mesure"])))
    .orderBy(asc(evenements.survenuLe));
  return lignes
    .flatMap((l) => {
      const m = l.donnees.mesures as { tensionSys?: number; tensionDia?: number } | undefined;
      return m?.tensionSys && m.tensionDia ? [{ date: aujourdhuiAuBenin(l.le), sys: m.tensionSys, dia: m.tensionDia }] : [];
    })
    .slice(-8);
}
