import { and, asc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { joursEntre, type DateISO } from "@/domain/dates";
import { agreger, CODES_INDICATEURS, premierDuMois, vide, type CodeIndicateur, type Valeurs } from "@/domain/pilotage";
import { PROGRAMMES } from "@/domain/programmes";
import { statutEtape } from "@/domain/statuts";
import type { Db } from "../db/client";
import { alertes, communes, evenements, foyers, indicateursZones, inscriptions, patients } from "../db/schema";
import { cleEtape, etapesFaites } from "./etapes-faites";
import { mesuresDes } from "./risques";

const JOUR_MS = 86_400_000;

/** Indicateurs calculés en direct, commune par commune, à partir des carnets : seuls des comptes sortent, jamais un nom. */
export async function indicateursDesCommunes(db: Db, communeIds: string[], aujourdhui: DateISO, maintenant: Date): Promise<Map<string, Valeurs>> {
  const resultat = new Map(communeIds.map((id) => [id, vide()]));
  if (communeIds.length === 0) return resultat;
  const personnes = await db
    .select({ id: patients.id, communeId: foyers.communeId })
    .from(patients)
    .innerJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(inArray(foyers.communeId, communeIds));
  const ids = personnes.map((p) => p.id);
  if (ids.length === 0) return resultat;
  const communeDe = new Map(personnes.map((p) => [p.id, p.communeId]));
  const valeursDe = (patientId: string) => resultat.get(communeDe.get(patientId)!)!;
  const [lesInscriptions, faites, mesures, lesAlertes, lesEvenements] = await Promise.all([
    db.select().from(inscriptions).where(inArray(inscriptions.patientId, ids)),
    etapesFaites(db, ids),
    mesuresDes(db, ids),
    db
      .select({ patientId: alertes.patientId, creeeLe: alertes.creeeLe, prise: alertes.priseEnChargeLe })
      .from(alertes)
      .where(and(inArray(alertes.patientId, ids), gte(alertes.creeeLe, new Date(maintenant.getTime() - 30 * JOUR_MS)), isNull(alertes.annuleeLe))),
    db
      .select({ patientId: evenements.patientId, type: evenements.type, donnees: evenements.donnees, le: evenements.survenuLe })
      .from(evenements)
      .where(
        and(
          inArray(evenements.patientId, ids),
          inArray(evenements.type, ["accouchement", "visite_domicile"]),
          gte(evenements.survenuLe, new Date(maintenant.getTime() - 365 * JOUR_MS)),
        ),
      ),
  ]);

  for (const i of lesInscriptions) {
    const v = valeursDe(i.patientId);
    const faitesDuPatient = faites.get(i.patientId);
    const etapes = planifier(PROGRAMMES[i.programme], i.dateReference, i.dateInscription);
    const faite = (e: (typeof etapes)[number]) => Boolean(faitesDuPatient?.has(cleEtape(e.motif, e.code)));
    const compter = (code: CodeIndicateur, codeEtape: string) => {
      const e = etapes.find((x) => x.code === codeEtape);
      // Seules les étapes dont le délai est passé comptent : un vaccin encore à venir n'est pas un échec.
      if (!e || joursEntre(e.datePrevue, aujourdhui) <= e.toleranceManqueJours) return;
      v[code].denominateur++;
      if (faite(e)) v[code].numerateur++;
    };
    if (i.programme === "grossesse") compter("cpn4", "cpn4");
    if (i.programme === "vaccination") {
      compter("penta3", "14sem");
      compter("rr1", "9mois");
    }
    if (i.programme === "hypertension" && i.active) {
      const derniere = (mesures.get(i.patientId) ?? [])
        .filter((m) => m.tensionSys !== undefined && joursEntre(m.date, aujourdhui) <= 180)
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1);
      if (derniere) {
        v.hta_controles.denominateur++;
        if ((derniere.tensionSys ?? 0) < 140 && (derniere.tensionDia ?? 0) < 90) v.hta_controles.numerateur++;
      }
    }
    if (i.active) {
      for (const e of etapes) {
        if (e.rendezVous && !faite(e) && statutEtape(e, false, aujourdhui) === "manquee" && joursEntre(e.datePrevue, aujourdhui) <= 60) v.etapes_manquees.numerateur++;
      }
    }
  }
  for (const a of lesAlertes) {
    const v = valeursDe(a.patientId);
    v.alertes_15min.denominateur++;
    if (a.prise) {
      const minutes = (a.prise.getTime() - a.creeeLe.getTime()) / 60_000;
      v.alertes_delai.numerateur += Math.round(minutes);
      v.alertes_delai.denominateur++;
      if (minutes <= 15) v.alertes_15min.numerateur++;
    }
  }
  for (const e of lesEvenements) {
    const v = valeursDe(e.patientId);
    if (e.type === "accouchement") {
      v.naissances_centre.denominateur++;
      if (e.donnees.lieu === "centre" || e.donnees.lieu === "hopital") v.naissances_centre.numerateur++;
    }
    if (e.type === "visite_domicile" && maintenant.getTime() - e.le.getTime() <= 30 * JOUR_MS) v.visites_relais.numerateur++;
  }
  return resultat;
}

/** Historique mensuel (table `indicateurs_zones`), additionné sur les zones demandées (toutes si aucune). */
async function historique(db: Db, zones?: string[]): Promise<{ mois: DateISO; valeurs: Valeurs }[]> {
  const lignes = await db
    .select()
    .from(indicateursZones)
    .where(zones ? inArray(indicateursZones.zone, zones) : undefined)
    .orderBy(asc(indicateursZones.mois));
  const parMois = new Map<DateISO, Valeurs>();
  for (const l of lignes) {
    if (!CODES_INDICATEURS.includes(l.code as CodeIndicateur)) continue;
    const v = parMois.get(l.mois) ?? vide();
    v[l.code as CodeIndicateur].numerateur += l.numerateur;
    v[l.code as CodeIndicateur].denominateur += l.denominateur;
    parMois.set(l.mois, v);
  }
  return [...parMois.entries()].map(([mois, valeurs]) => ({ mois, valeurs }));
}

export interface AlertesEnDirect {
  enAttente: number;
  enRetard: number;
  /** Âge de la plus ancienne alerte qui attend, en minutes. */
  plusAncienneMinutes: number | null;
}

/** Les alertes de la zone que personne n'a encore prises en charge : un décompte, jamais un nom. Celles en retard « remontent » ici. */
export async function alertesDeLaZone(db: Db, communeIds: string[], maintenant: Date): Promise<AlertesEnDirect> {
  if (communeIds.length === 0) return { enAttente: 0, enRetard: 0, plusAncienneMinutes: null };
  const ouvertes = await db
    .select({ creeeLe: alertes.creeeLe, echeance: alertes.echeance })
    .from(alertes)
    .innerJoin(patients, eq(alertes.patientId, patients.id))
    .innerJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(and(inArray(foyers.communeId, communeIds), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe)));
  const plusAncienne = ouvertes.reduce<Date | null>((min, a) => (!min || a.creeeLe < min ? a.creeeLe : min), null);
  return {
    enAttente: ouvertes.length,
    enRetard: ouvertes.filter((a) => a.echeance.getTime() < maintenant.getTime()).length,
    plusAncienneMinutes: plusAncienne ? Math.round((maintenant.getTime() - plusAncienne.getTime()) / 60_000) : null,
  };
}

export interface VueZone {
  zone: string;
  departement: string;
  alertes: AlertesEnDirect;
  communes: { nom: string; valeurs: Valeurs }[];
  total: Valeurs;
  tendance: { mois: DateISO; valeurs: Valeurs }[];
}

/** Ce que voient les agents de l'État d'une zone sanitaire : ses communes, en direct, et la tendance sur 6 mois. */
export async function vueDeZone(db: Db, communeId: string, aujourdhui: DateISO, maintenant: Date): Promise<VueZone | null> {
  const [commune] = await db.select().from(communes).where(eq(communes.id, communeId));
  if (!commune?.zoneSanitaire) return null;
  const lesCommunes = await db.select().from(communes).where(eq(communes.zoneSanitaire, commune.zoneSanitaire)).orderBy(asc(communes.nom));
  const [parCommune, alertesEnDirect] = await Promise.all([
    indicateursDesCommunes(db, lesCommunes.map((c) => c.id), aujourdhui, maintenant),
    alertesDeLaZone(db, lesCommunes.map((c) => c.id), maintenant),
  ]);
  const total = agreger([...parCommune.values()]);
  const mois = premierDuMois(aujourdhui);
  const passe = (await historique(db, [commune.zoneSanitaire])).filter((h) => h.mois < mois);
  return {
    zone: commune.zoneSanitaire,
    departement: commune.departement,
    alertes: alertesEnDirect,
    communes: lesCommunes.map((c) => ({ nom: c.nom, valeurs: parCommune.get(c.id)! })),
    total,
    tendance: [...passe, { mois, valeurs: total }].slice(-6),
  };
}

export interface VueNationale {
  mois: DateISO;
  zones: { zone: string; departement: string; valeurs: Valeurs; direct: boolean }[];
  national: Valeurs;
  tendance: { mois: DateISO; valeurs: Valeurs }[];
}

/** Ce que voit le ministère : toutes les zones sanitaires, les chiffres nationaux et leur tendance. */
export async function vueNationale(db: Db, aujourdhui: DateISO, maintenant: Date): Promise<VueNationale> {
  const mois = premierDuMois(aujourdhui);
  const zonesDirectes = await db
    .selectDistinct({ zone: communes.zoneSanitaire, departement: communes.departement })
    .from(communes)
    .where(isNotNull(communes.zoneSanitaire));
  const directes = await Promise.all(
    zonesDirectes.map(async (z) => {
      const ids = (await db.select({ id: communes.id }).from(communes).where(eq(communes.zoneSanitaire, z.zone!))).map((c) => c.id);
      return { zone: z.zone!, departement: z.departement, valeurs: agreger([...(await indicateursDesCommunes(db, ids, aujourdhui, maintenant)).values()]), direct: true };
    }),
  );
  const nomsDirects = new Set(directes.map((d) => d.zone));
  const duMois = await db.select().from(indicateursZones).where(eq(indicateursZones.mois, mois));
  const autres = new Map<string, { zone: string; departement: string; valeurs: Valeurs; direct: boolean }>();
  for (const l of duMois) {
    if (nomsDirects.has(l.zone) || !CODES_INDICATEURS.includes(l.code as CodeIndicateur)) continue;
    const z = autres.get(l.zone) ?? { zone: l.zone, departement: l.departement, valeurs: vide(), direct: false };
    z.valeurs[l.code as CodeIndicateur] = { numerateur: l.numerateur, denominateur: l.denominateur };
    autres.set(l.zone, z);
  }
  const zones = [...directes, ...autres.values()].sort((a, b) => a.zone.localeCompare(b.zone, "fr"));
  const national = agreger(zones.map((z) => z.valeurs));
  const passe = (await historique(db)).filter((h) => h.mois < mois);
  return { mois, zones, national, tendance: [...passe, { mois, valeurs: national }].slice(-6) };
}
