import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { aujourdhuiAuBenin, type DateISO } from "@/domain/dates";
import { PROGRAMMES, type CodeProgramme } from "@/domain/programmes";
import { evaluerRisque, risqueGlobal, type Mesure, type ResultatRisque } from "@/domain/risque";
import { compterManquees } from "@/domain/statuts";
import type { Db } from "../db/client";
import { alertes, evenements, inscriptions } from "../db/schema";
import { cleEtape, etapesFaites } from "./etapes-faites";

export type MesureDatee = Mesure & { source: "consultation" | "mesure" };

const CHAMPS = ["tensionSys", "tensionDia", "glycemieGL", "hemoglobineGDL", "poidsKg"] as const;

/** Relevés de chaque personne : mesures prises en consultation et relevés faits à domicile ou par le relais. */
export async function mesuresDes(db: Db, patientIds: string[]): Promise<Map<string, MesureDatee[]>> {
  const resultat = new Map<string, MesureDatee[]>();
  if (patientIds.length === 0) return resultat;
  const lignes = await db
    .select({ patientId: evenements.patientId, type: evenements.type, donnees: evenements.donnees, survenuLe: evenements.survenuLe })
    .from(evenements)
    .where(and(inArray(evenements.patientId, patientIds), inArray(evenements.type, ["consultation", "mesure"])));
  for (const l of lignes) {
    const brutes = (l.donnees.mesures ?? {}) as Record<string, unknown>;
    const mesure: MesureDatee = { date: aujourdhuiAuBenin(l.survenuLe), source: l.type === "mesure" ? "mesure" : "consultation" };
    for (const champ of CHAMPS) {
      const valeur = brutes[champ];
      if (typeof valeur === "number") mesure[champ] = valeur;
    }
    if (!CHAMPS.some((champ) => mesure[champ] !== undefined)) continue;
    resultat.set(l.patientId, [...(resultat.get(l.patientId) ?? []), mesure]);
  }
  for (const liste of resultat.values()) liste.sort((a, b) => a.date.localeCompare(b.date));
  return resultat;
}

export interface PatientPourRisque {
  id: string;
  dateNaissance: DateISO;
  antecedents: { cesarienne?: boolean };
}

export interface RisquePatient {
  global: ResultatRisque;
  programmes: { code: CodeProgramme; resultat: ResultatRisque }[];
}

/** Niveau de risque de chaque personne, programme par programme, avec ses motifs (règles de la spec §5). */
export async function risquesDes(db: Db, lesPatients: PatientPourRisque[], aujourdhui: DateISO): Promise<Map<string, RisquePatient>> {
  const resultat = new Map<string, RisquePatient>();
  const ids = lesPatients.map((p) => p.id);
  if (ids.length === 0) return resultat;
  const [lesInscriptions, mesures, faites, ouvertes] = await Promise.all([
    db.select().from(inscriptions).where(and(inArray(inscriptions.patientId, ids), eq(inscriptions.active, true))),
    mesuresDes(db, ids),
    etapesFaites(db, ids),
    db
      .select({ patientId: alertes.patientId })
      .from(alertes)
      .where(and(inArray(alertes.patientId, ids), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe))),
  ]);
  for (const p of lesPatients) {
    const faitesDuPatient = faites.get(p.id);
    const programmes = lesInscriptions
      .filter((i) => i.patientId === p.id)
      .map((i) => {
        const etapes = planifier(PROGRAMMES[i.programme], i.dateReference, i.dateInscription);
        const codesFaits = new Set(etapes.filter((e) => faitesDuPatient?.has(cleEtape(e.motif, e.code))).map((e) => e.code));
        return {
          code: i.programme,
          resultat: evaluerRisque(i.programme, {
            aujourdhui,
            dateNaissance: p.dateNaissance,
            antecedents: p.antecedents,
            mesures: mesures.get(p.id) ?? [],
            etapesManquees: compterManquees(etapes, codesFaits, aujourdhui),
            signalementsOuverts: ouvertes.filter((a) => a.patientId === p.id).length,
          }),
        };
      });
    resultat.set(p.id, { global: risqueGlobal(programmes.map((x) => x.resultat)), programmes });
  }
  return resultat;
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
