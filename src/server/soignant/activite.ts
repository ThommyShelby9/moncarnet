import { and, desc, eq, gte } from "drizzle-orm";
import type { ConstatVisite } from "@/domain/evenements";
import type { CodeSigne } from "@/domain/signes-danger";
import type { Db } from "../db/client";
import { alertes, comptes, evenements, fichiers, patients } from "../db/schema";

export interface VisiteDuCentre {
  id: string;
  le: Date;
  constat: ConstatVisite;
  texte: string | null;
  relais: string;
  /** Une note vocale est arrivée : elle s'écoute par /api/fichiers/[id]. */
  note: boolean;
  patientId: string;
  prenom: string;
  nom: string;
}

/** Les visites des relais chez les personnes du centre : celles à orienter d'abord, puis les plus récentes. */
export async function visitesDuCentre(db: Db, etablissementId: string, depuis: Date): Promise<VisiteDuCentre[]> {
  const lignes = await db
    .select({
      id: evenements.id,
      le: evenements.survenuLe,
      donnees: evenements.donnees,
      relais: comptes.nomAffiche,
      note: fichiers.evenementId,
      patientId: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
    })
    .from(evenements)
    .innerJoin(patients, eq(evenements.patientId, patients.id))
    .leftJoin(comptes, eq(evenements.auteurId, comptes.id))
    .leftJoin(fichiers, eq(fichiers.evenementId, evenements.id))
    .where(and(eq(patients.etablissementId, etablissementId), eq(evenements.type, "visite_domicile"), gte(evenements.survenuLe, depuis)))
    .orderBy(desc(evenements.survenuLe));
  const visites = lignes.map((l) => ({
    id: l.id,
    le: l.le,
    constat: l.donnees.constat as ConstatVisite,
    texte: typeof l.donnees.texte === "string" ? l.donnees.texte : null,
    relais: l.relais ?? "Relais",
    note: l.note !== null,
    patientId: l.patientId,
    prenom: l.prenom,
    nom: l.nom,
  }));
  return [...visites.filter((v) => v.constat === "a_orienter"), ...visites.filter((v) => v.constat !== "a_orienter")];
}

export type StatutAlerte = "en_retard" | "en_cours" | "prise" | "annulee";

export interface AlerteDuCentre {
  id: string;
  patientId: string;
  prenom: string;
  nom: string;
  signes: CodeSigne[];
  creeeLe: Date;
  statut: StatutAlerte;
  /** Minutes entre le signalement et la prise en charge. */
  delaiMinutes: number | null;
  prisePar: string | null;
}

export interface BilanAlertes {
  total: number;
  prises: number;
  enCours: number;
  enRetard: number;
  /** Délai moyen de prise en charge, en minutes (null sans alerte prise). */
  delaiMoyen: number | null;
  /** Part des alertes prises en charge en 15 minutes ou moins, en pour cent. */
  partSous15: number | null;
}

const RANG: Record<StatutAlerte, number> = { en_retard: 0, en_cours: 1, prise: 2, annulee: 2 };

/** L'historique des alertes du centre : en retard et en cours d'abord, puis les plus récentes ; et le bilan des délais (spec §4.6). */
export async function alertesDuCentre(
  db: Db,
  etablissementId: string,
  depuis: Date,
  maintenant: Date,
): Promise<{ alertes: AlerteDuCentre[]; bilan: BilanAlertes }> {
  const lignes = await db
    .select({
      id: alertes.id,
      patientId: alertes.patientId,
      prenom: patients.prenom,
      nom: patients.nom,
      donnees: evenements.donnees,
      creeeLe: alertes.creeeLe,
      echeance: alertes.echeance,
      priseLe: alertes.priseEnChargeLe,
      annuleeLe: alertes.annuleeLe,
      prisePar: comptes.nomAffiche,
    })
    .from(alertes)
    .innerJoin(patients, eq(alertes.patientId, patients.id))
    .innerJoin(evenements, eq(alertes.evenementId, evenements.id))
    .leftJoin(comptes, eq(alertes.priseEnChargePar, comptes.id))
    .where(and(eq(alertes.etablissementId, etablissementId), gte(alertes.creeeLe, depuis)))
    .orderBy(desc(alertes.creeeLe));
  const liste: AlerteDuCentre[] = lignes.map((l) => {
    const statut: StatutAlerte = l.priseLe ? "prise" : l.annuleeLe ? "annulee" : maintenant > l.echeance ? "en_retard" : "en_cours";
    return {
      id: l.id,
      patientId: l.patientId,
      prenom: l.prenom,
      nom: l.nom,
      signes: (l.donnees.signes as CodeSigne[] | undefined) ?? [],
      creeeLe: l.creeeLe,
      statut,
      delaiMinutes: l.priseLe ? Math.round((l.priseLe.getTime() - l.creeeLe.getTime()) / 60_000) : null,
      prisePar: l.priseLe ? (l.prisePar ?? null) : null,
    };
  });
  liste.sort((a, b) => RANG[a.statut] - RANG[b.statut] || b.creeeLe.getTime() - a.creeeLe.getTime());
  const delais = liste.flatMap((a) => (a.delaiMinutes === null ? [] : [a.delaiMinutes]));
  return {
    alertes: liste,
    bilan: {
      total: liste.length,
      prises: delais.length,
      enCours: liste.filter((a) => a.statut === "en_cours").length,
      enRetard: liste.filter((a) => a.statut === "en_retard").length,
      delaiMoyen: delais.length ? Math.round(delais.reduce((s, d) => s + d, 0) / delais.length) : null,
      partSous15: delais.length ? Math.round((delais.filter((d) => d <= 15).length / delais.length) * 100) : null,
    },
  };
}
