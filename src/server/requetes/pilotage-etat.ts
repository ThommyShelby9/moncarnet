import { and, asc, count, eq, gte, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { ajouterJours, aujourdhuiAuBenin, depuisDateISO, type DateISO } from "@/domain/dates";
import { CODES_INDICATEURS, premierDuMois, vide, type CodeIndicateur, type Valeurs } from "@/domain/pilotage";
import type { Db } from "../db/client";
import { alertes, comptes, communes, creneaux, etablissements, evenements, foyers, indicateursZones, passages, patients, rendezVous } from "../db/schema";
import { vueDeZone, type AlertesEnDirect } from "./pilotage";

const JOUR_MS = 86_400_000;
const PERIODE_JOURS = 30;

export interface FicheZone {
  zone: string;
  departement: string;
  /** Calculée en direct depuis les carnets (zone de la démo) ; sinon lue dans l'historique. */
  direct: boolean;
  valeurs: Valeurs;
  communes: { nom: string; valeurs: Valeurs }[];
  tendance: { mois: DateISO; valeurs: Valeurs }[];
  alertes: AlertesEnDirect | null;
}

/** La fiche d'une zone sanitaire pour le ministère : en direct si ses carnets sont ici, sinon depuis l'historique mensuel. */
export async function vueDUneZone(db: Db, zone: string, aujourdhui: DateISO, maintenant: Date): Promise<FicheZone | null> {
  const [commune] = await db.select().from(communes).where(eq(communes.zoneSanitaire, zone)).orderBy(asc(communes.nom)).limit(1);
  if (commune) {
    const vue = await vueDeZone(db, commune.id, aujourdhui, maintenant);
    if (!vue) return null;
    return { zone, departement: vue.departement, direct: true, valeurs: vue.total, communes: vue.communes, tendance: vue.tendance, alertes: vue.alertes };
  }
  const mois = premierDuMois(aujourdhui);
  const lignes = await db.select().from(indicateursZones).where(eq(indicateursZones.zone, zone)).orderBy(asc(indicateursZones.mois));
  if (!lignes.length) return null;
  const parMois = new Map<DateISO, Valeurs>();
  for (const l of lignes) {
    if (l.mois > mois || !CODES_INDICATEURS.includes(l.code as CodeIndicateur)) continue;
    const v = parMois.get(l.mois) ?? vide();
    v[l.code as CodeIndicateur] = { numerateur: l.numerateur, denominateur: l.denominateur };
    parMois.set(l.mois, v);
  }
  const tendance = [...parMois.entries()].map(([m, valeurs]) => ({ mois: m, valeurs })).slice(-6);
  return { zone, departement: lignes[0]!.departement, direct: false, valeurs: parMois.get(mois) ?? vide(), communes: [], tendance, alertes: null };
}

export interface ActiviteCentre {
  id: string;
  nom: string;
  commune: string;
  /** Consultations et vaccinations des 30 derniers jours. */
  consultations: number;
  /** De l'arrivée à l'appel en salle d'attente, en minutes, sur 30 jours (null sans passage). */
  attenteMoyenne: number | null;
  alertes: { total: number; delaiMoyen: number | null; partSous15: number | null };
  /** Places des 7 prochains jours. */
  remplissage: { prises: number; capacite: number };
}

export interface ActiviteRelais {
  id: string;
  nom: string;
  foyers: number;
  personnes: number;
  /** Visites à domicile des 30 derniers jours. */
  visites: number;
  foyersVisites: number;
  aOrienter: number;
}

const moyenne = (liste: number[]) => (liste.length ? Math.round(liste.reduce((s, x) => s + x, 0) / liste.length) : null);

async function communesDeLaZone(db: Db, zone: string) {
  return db.select({ id: communes.id, nom: communes.nom }).from(communes).where(eq(communes.zoneSanitaire, zone));
}

/** L'activité des centres et des relais d'une zone : des comptes et des délais, jamais un nom de patient (spec §4.10). */
export async function centresDeLaZone(db: Db, zone: string, aujourdhui: DateISO, maintenant: Date): Promise<{ centres: ActiviteCentre[]; relais: ActiviteRelais[] }> {
  const lesCommunes = await communesDeLaZone(db, zone);
  if (!lesCommunes.length) return { centres: [], relais: [] };
  const ids = lesCommunes.map((c) => c.id);
  const depuis = new Date(maintenant.getTime() - PERIODE_JOURS * JOUR_MS);
  const lesCentres = await db
    .select({ id: etablissements.id, nom: etablissements.nom, communeId: etablissements.communeId })
    .from(etablissements)
    .where(and(inArray(etablissements.communeId, ids), eq(etablissements.type, "centre_sante")))
    .orderBy(asc(etablissements.nom));

  const centres = await Promise.all(
    lesCentres.map(async (c): Promise<ActiviteCentre> => {
      const [[consultations], lesPassages, lesAlertes, plages] = await Promise.all([
        db
          .select({ nombre: count() })
          .from(evenements)
          .innerJoin(patients, eq(evenements.patientId, patients.id))
          .where(and(eq(patients.etablissementId, c.id), inArray(evenements.type, ["consultation", "vaccination"]), gte(evenements.survenuLe, depuis))),
        db
          .select({ arrive: passages.arriveLe, appele: passages.appeleLe })
          .from(passages)
          .where(and(eq(passages.etablissementId, c.id), isNotNull(passages.appeleLe), gte(passages.jour, ajouterJours(aujourdhui, -PERIODE_JOURS)))),
        db
          .select({ creeeLe: alertes.creeeLe, prise: alertes.priseEnChargeLe })
          .from(alertes)
          .where(and(eq(alertes.etablissementId, c.id), gte(alertes.creeeLe, depuis), isNull(alertes.annuleeLe))),
        db
          .select({ id: creneaux.id, capacite: creneaux.capacite })
          .from(creneaux)
          .where(and(eq(creneaux.etablissementId, c.id), gte(creneaux.date, aujourdhui), lt(creneaux.date, ajouterJours(aujourdhui, 7)))),
      ]);
      const [prises] = plages.length
        ? await db
            .select({ nombre: count() })
            .from(rendezVous)
            .where(and(inArray(rendezVous.creneauId, plages.map((p) => p.id)), isNull(rendezVous.annuleLe)))
        : [{ nombre: 0 }];
      const delais = lesAlertes.flatMap((a) => (a.prise ? [(a.prise.getTime() - a.creeeLe.getTime()) / 60_000] : []));
      return {
        id: c.id,
        nom: c.nom,
        commune: lesCommunes.find((x) => x.id === c.communeId)!.nom,
        consultations: Number(consultations?.nombre ?? 0),
        attenteMoyenne: moyenne(lesPassages.map((p) => (p.appele!.getTime() - p.arrive.getTime()) / 60_000)),
        alertes: {
          total: lesAlertes.length,
          delaiMoyen: moyenne(delais),
          partSous15: delais.length ? Math.round((delais.filter((d) => d <= 15).length / delais.length) * 100) : null,
        },
        remplissage: { prises: Number(prises?.nombre ?? 0), capacite: plages.reduce((s, p) => s + p.capacite, 0) },
      };
    }),
  );

  const lesFoyers = await db
    .select({ id: foyers.id, relaisId: foyers.relaisId, relais: comptes.nomAffiche })
    .from(foyers)
    .innerJoin(comptes, eq(foyers.relaisId, comptes.id))
    .where(and(inArray(foyers.communeId, ids), isNotNull(foyers.relaisId)));
  const relaisIds = [...new Set(lesFoyers.map((f) => f.relaisId!))];
  const [personnes, visites] = relaisIds.length
    ? await Promise.all([
        db
          .select({ foyerId: patients.foyerId })
          .from(patients)
          .where(inArray(patients.foyerId, lesFoyers.map((f) => f.id))),
        db
          .select({ auteurId: evenements.auteurId, foyerId: patients.foyerId, donnees: evenements.donnees })
          .from(evenements)
          .innerJoin(patients, eq(evenements.patientId, patients.id))
          .where(and(inArray(evenements.auteurId, relaisIds), eq(evenements.type, "visite_domicile"), gte(evenements.survenuLe, depuis))),
      ])
    : [[], []];
  const relais = relaisIds
    .map((id): ActiviteRelais => {
      const sesFoyers = new Set(lesFoyers.filter((f) => f.relaisId === id).map((f) => f.id));
      const sesVisites = visites.filter((v) => v.auteurId === id);
      return {
        id,
        nom: lesFoyers.find((f) => f.relaisId === id)!.relais,
        foyers: sesFoyers.size,
        personnes: personnes.filter((p) => p.foyerId && sesFoyers.has(p.foyerId)).length,
        visites: sesVisites.length,
        foyersVisites: new Set(sesVisites.flatMap((v) => (v.foyerId && sesFoyers.has(v.foyerId) ? [v.foyerId] : []))).size,
        aOrienter: sesVisites.filter((v) => v.donnees.constat === "a_orienter").length,
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return { centres, relais };
}

export interface SemaineAlertes {
  /** Le lundi de la semaine. */
  debut: DateISO;
  total: number;
  prises: number;
  /** Prises en charge en 15 minutes ou moins. */
  sous15: number;
  delaiMoyen: number | null;
}

const lundiDe = (jour: DateISO) => ajouterJours(jour, -((depuisDateISO(jour).getUTCDay() + 6) % 7));

/** Les alertes des centres de la zone, semaine par semaine (lundi au dimanche), la plus ancienne d'abord. */
export async function alertesParSemaine(db: Db, zone: string, aujourdhui: DateISO, semaines: number): Promise<SemaineAlertes[]> {
  const derniere = lundiDe(aujourdhui);
  const debuts = Array.from({ length: semaines }, (_, i) => ajouterJours(derniere, -7 * (semaines - 1 - i)));
  const vides = debuts.map((debut) => ({ debut, total: 0, prises: 0, sous15: 0, delaiMoyen: null }));
  const ids = (await communesDeLaZone(db, zone)).map((c) => c.id);
  if (!ids.length) return vides;
  const lignes = await db
    .select({ creeeLe: alertes.creeeLe, prise: alertes.priseEnChargeLe })
    .from(alertes)
    .innerJoin(etablissements, eq(alertes.etablissementId, etablissements.id))
    .where(and(inArray(etablissements.communeId, ids), isNull(alertes.annuleeLe), gte(alertes.creeeLe, new Date(`${debuts[0]}T00:00:00+01:00`))));
  return debuts.map((debut) => {
    const fin = ajouterJours(debut, 7);
    const dela = lignes.filter((l) => {
      const jour = aujourdhuiAuBenin(l.creeeLe);
      return jour >= debut && jour < fin;
    });
    const delais = dela.flatMap((l) => (l.prise ? [(l.prise.getTime() - l.creeeLe.getTime()) / 60_000] : []));
    return { debut, total: dela.length, prises: delais.length, sous15: delais.filter((d) => d <= 15).length, delaiMoyen: moyenne(delais) };
  });
}
