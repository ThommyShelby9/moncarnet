import { and, eq, gte, inArray, lt } from "drizzle-orm";
import type { EntreeCartes } from "@/domain/cartes-du-jour";
import { ajouterJours, aujourdhuiAuBenin, type DateISO } from "@/domain/dates";
import { debutDuJourAuBenin, type MomentPrise } from "@/domain/temps";
import { traitementsEnCours, type PriseNotee, type StatutPrise, type TraitementEnCours } from "@/domain/traitements";
import type { Db } from "../db/client";
import { evenements, ordonnances } from "../db/schema";
import { rendezVousVus } from "./rendez-vous";

/** Traitements en cours : ordonnances dont la délivrance est enregistrée. */
export async function traitementsDes(db: Db, patientIds: string[], aujourdhui: DateISO): Promise<TraitementEnCours[]> {
  if (patientIds.length === 0) return [];
  const [lesOrdonnances, delivrances] = await Promise.all([
    db
      .select({ id: ordonnances.id, patientId: ordonnances.patientId, lignes: ordonnances.lignes })
      .from(ordonnances)
      .where(inArray(ordonnances.patientId, patientIds)),
    db
      .select({ donnees: evenements.donnees, survenuLe: evenements.survenuLe })
      .from(evenements)
      .where(and(inArray(evenements.patientId, patientIds), eq(evenements.type, "delivrance"))),
  ]);
  const delivreeLe = new Map<string, DateISO>();
  for (const d of delivrances) {
    const ordonnanceId = d.donnees.ordonnanceId;
    if (typeof ordonnanceId === "string" && !delivreeLe.has(ordonnanceId)) delivreeLe.set(ordonnanceId, aujourdhuiAuBenin(d.survenuLe));
  }
  return traitementsEnCours(
    lesOrdonnances.map((o) => ({ ...o, delivreeLe: delivreeLe.get(o.id) ?? null })),
    aujourdhui,
  );
}

/** Prises notées ce jour-là, de minuit à minuit à l'heure du Bénin. */
export async function prisesDuJour(db: Db, patientIds: string[], jour: DateISO): Promise<PriseNotee[]> {
  if (patientIds.length === 0) return [];
  const lignes = await db
    .select({ donnees: evenements.donnees, survenuLe: evenements.survenuLe })
    .from(evenements)
    .where(
      and(
        inArray(evenements.patientId, patientIds),
        eq(evenements.type, "prise_medicament"),
        gte(evenements.survenuLe, debutDuJourAuBenin(jour)),
        lt(evenements.survenuLe, debutDuJourAuBenin(ajouterJours(jour, 1))),
      ),
    );
  return lignes.map((l) => {
    const d = l.donnees as { traitement: string; moment: MomentPrise; statut: StatutPrise };
    return { traitementCle: d.traitement, moment: d.moment, statut: d.statut, survenuLe: l.survenuLe };
  });
}

/** Tout ce qu'il faut pour calculer les cartes du jour d'une famille. */
export async function donneesAccueil(
  db: Db,
  patientIds: string[],
  aujourdhui: DateISO,
): Promise<Pick<EntreeCartes, "traitements" | "prisesDuJour" | "rendezVous">> {
  const [traitements, prises, rendezVous] = await Promise.all([
    traitementsDes(db, patientIds, aujourdhui),
    prisesDuJour(db, patientIds, aujourdhui),
    rendezVousVus(db, patientIds, ajouterJours(aujourdhui, -60)),
  ]);
  return { traitements, prisesDuJour: prises, rendezVous };
}
