import { and, asc, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { ageEnAnnees, ajouterJours, libelleAge, type DateISO } from "@/domain/dates";
import type { ConstatVisite } from "@/domain/evenements";
import type { MotifRdv, NiveauRisque } from "@/domain/programmes";
import { semainesDeGrossesse } from "@/domain/programmes/grossesse";
import { analyserRecherche, correspondAuNom } from "@/domain/recherche";
import { LIBELLES_PLAGE, LIBELLES_RDV } from "@/domain/rendez-vous";
import type { CodeSigne } from "@/domain/signes-danger";
import { debutDuJourAuBenin, LIBELLE_MOMENT_RDV } from "@/domain/temps";
import type { Db } from "../db/client";
import { alertes, comptes, contacts, creneaux, etablissements, evenements, fichiers, foyers, inscriptions, patients, rendezVous } from "../db/schema";
import { patientDuCentre } from "../droits";
import { programmesDuCarnet, type ProgrammeDuCarnet } from "./carnet";
import { ordonnancesDe, type OrdonnanceDetaillee } from "./ordonnances";
import { rendezVousVus } from "./rendez-vous";
import { mesuresDes, risquesDes, type MesureDatee, type RisquePatient } from "./risques";

export async function nomEtablissement(db: Db, etablissementId: string): Promise<string> {
  const [e] = await db.select({ nom: etablissements.nom }).from(etablissements).where(eq(etablissements.id, etablissementId));
  return e?.nom ?? "";
}

export async function telephonesPrincipaux(db: Db, patientIds: string[]): Promise<Map<string, string>> {
  if (patientIds.length === 0) return new Map();
  const lignes = await db
    .select({ patientId: contacts.patientId, telephone: contacts.telephone })
    .from(contacts)
    .where(and(inArray(contacts.patientId, patientIds), eq(contacts.role, "principal")));
  return new Map(lignes.map((l) => [l.patientId, l.telephone]));
}

export interface AlerteOuverte {
  id: string;
  patientId: string;
  prenom: string;
  nom: string;
  sexe: "F" | "M";
  libelleAge: string;
  semainesGrossesse: number | null;
  telephone: string | null;
  signes: CodeSigne[];
  creeeLe: Date;
  echeance: Date;
}

/** Alertes du centre que personne n'a encore prises en charge, la plus ancienne d'abord. */
export async function alertesOuvertes(db: Db, etablissementId: string, aujourdhui: DateISO): Promise<AlerteOuverte[]> {
  const lignes = await db
    .select({
      id: alertes.id,
      patientId: alertes.patientId,
      creeeLe: alertes.creeeLe,
      echeance: alertes.echeance,
      donnees: evenements.donnees,
      prenom: patients.prenom,
      nom: patients.nom,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
    })
    .from(alertes)
    .innerJoin(patients, eq(alertes.patientId, patients.id))
    .innerJoin(evenements, eq(alertes.evenementId, evenements.id))
    .where(and(eq(alertes.etablissementId, etablissementId), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe)))
    .orderBy(asc(alertes.creeeLe));
  const ids = [...new Set(lignes.map((l) => l.patientId))];
  const [telephones, grossesses] = await Promise.all([
    telephonesPrincipaux(db, ids),
    ids.length
      ? db
          .select({ patientId: inscriptions.patientId, dateReference: inscriptions.dateReference })
          .from(inscriptions)
          .where(and(inArray(inscriptions.patientId, ids), eq(inscriptions.programme, "grossesse"), eq(inscriptions.active, true)))
      : Promise.resolve([]),
  ]);
  return lignes.map((l) => {
    const grossesse = grossesses.find((g) => g.patientId === l.patientId);
    return {
      id: l.id,
      patientId: l.patientId,
      prenom: l.prenom,
      nom: l.nom,
      sexe: l.sexe,
      libelleAge: libelleAge(l.dateNaissance, aujourdhui),
      semainesGrossesse: grossesse ? semainesDeGrossesse(grossesse.dateReference, aujourdhui) : null,
      telephone: telephones.get(l.patientId) ?? null,
      signes: (l.donnees.signes ?? []) as CodeSigne[],
      creeeLe: l.creeeLe,
      echeance: l.echeance,
    };
  });
}

export interface LigneDuJour {
  rendezVousId: string;
  patientId: string;
  prenom: string;
  nom: string;
  libelleAge: string;
  motif: MotifRdv;
  libelle: string;
  vu: boolean;
  risque: NiveauRisque;
}

export interface GroupeDuJour {
  cle: string;
  titre: string;
  moment: "matin" | "apres_midi" | null;
  capacite: number | null;
  lignes: LigneDuJour[];
}

const ORDRE_MOMENT = { matin: 0, apres_midi: 1 } as const;

/** Rendez-vous du jour du centre, par plage : qui est attendu, qui est déjà vu, et le risque de chacun. */
export async function consultationsDuJour(db: Db, etablissementId: string, aujourdhui: DateISO): Promise<GroupeDuJour[]> {
  const lignes = await db
    .select({
      rendezVousId: rendezVous.id,
      patientId: rendezVous.patientId,
      motif: rendezVous.motif,
      creneauId: rendezVous.creneauId,
      moment: creneaux.moment,
      motifPlage: creneaux.motif,
      capacite: creneaux.capacite,
      prenom: patients.prenom,
      nom: patients.nom,
      dateNaissance: patients.dateNaissance,
      antecedents: patients.antecedents,
    })
    .from(rendezVous)
    .innerJoin(patients, eq(rendezVous.patientId, patients.id))
    .leftJoin(creneaux, eq(rendezVous.creneauId, creneaux.id))
    .where(and(eq(rendezVous.etablissementId, etablissementId), eq(rendezVous.datePrevue, aujourdhui), isNull(rendezVous.annuleLe)));
  if (lignes.length === 0) return [];
  const personnes = [...new Map(lignes.map((l) => [l.patientId, { id: l.patientId, dateNaissance: l.dateNaissance, antecedents: l.antecedents }])).values()];
  const ids = personnes.map((p) => p.id);
  const [vus, rdvVus, risques] = await Promise.all([
    db
      .select({ patientId: evenements.patientId })
      .from(evenements)
      .where(
        and(
          inArray(evenements.patientId, ids),
          inArray(evenements.type, ["consultation", "vaccination"]),
          gte(evenements.survenuLe, debutDuJourAuBenin(aujourdhui)),
          lt(evenements.survenuLe, debutDuJourAuBenin(ajouterJours(aujourdhui, 1))),
        ),
      ),
    rendezVousVus(db, ids, aujourdhui),
    risquesDes(db, personnes, aujourdhui),
  ]);
  const dejaVus = new Set(vus.map((v) => v.patientId));
  const groupes = new Map<string, GroupeDuJour>();
  for (const l of lignes) {
    const cle = l.creneauId ?? "sans-place";
    let groupe = groupes.get(cle);
    if (!groupe) {
      groupe = {
        cle,
        titre: l.moment && l.motifPlage ? `${LIBELLES_PLAGE[l.motifPlage]}, ${LIBELLE_MOMENT_RDV[l.moment]}` : "Prévus aujourd'hui, sans place réservée",
        moment: l.moment,
        capacite: l.capacite,
        lignes: [],
      };
      groupes.set(cle, groupe);
    }
    groupe.lignes.push({
      rendezVousId: l.rendezVousId,
      patientId: l.patientId,
      prenom: l.prenom,
      nom: l.nom,
      libelleAge: libelleAge(l.dateNaissance, aujourdhui),
      motif: l.motif,
      libelle: rdvVus.find((r) => r.id === l.rendezVousId)?.libelle ?? LIBELLES_RDV[l.motif],
      vu: dejaVus.has(l.patientId),
      risque: risques.get(l.patientId)?.global.niveau ?? "normal",
    });
  }
  const ordre = (g: GroupeDuJour) => (g.moment ? ORDRE_MOMENT[g.moment] : 2);
  return [...groupes.values()]
    .sort((a, b) => ordre(a) - ordre(b) || a.titre.localeCompare(b.titre, "fr"))
    .map((g) => ({ ...g, lignes: [...g.lignes].sort((a, b) => a.prenom.localeCompare(b.prenom, "fr")) }));
}

export interface PatientASurveiller {
  patientId: string;
  prenom: string;
  nom: string;
  libelleAge: string;
  niveau: NiveauRisque;
  motif: string;
}

const RANG_RISQUE: Record<NiveauRisque, number> = { eleve: 0, surveillance: 1, normal: 2 };

/** Patients du centre à risque élevé puis à surveiller, avec le premier motif. */
export async function patientsASurveiller(db: Db, etablissementId: string, aujourdhui: DateISO, limite = 6): Promise<PatientASurveiller[]> {
  const liste = await db
    .select({ id: patients.id, prenom: patients.prenom, nom: patients.nom, dateNaissance: patients.dateNaissance, antecedents: patients.antecedents })
    .from(patients)
    .where(eq(patients.etablissementId, etablissementId));
  const risques = await risquesDes(db, liste, aujourdhui);
  return liste
    .flatMap((p) => {
      const risque = risques.get(p.id)?.global;
      if (!risque || risque.niveau === "normal") return [];
      return [{ patientId: p.id, prenom: p.prenom, nom: p.nom, libelleAge: libelleAge(p.dateNaissance, aujourdhui), niveau: risque.niveau, motif: risque.motifs[0] ?? "" }];
    })
    .sort((a, b) => RANG_RISQUE[a.niveau] - RANG_RISQUE[b.niveau] || a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"))
    .slice(0, limite);
}

export interface PatientTrouve {
  id: string;
  prenom: string;
  nom: string;
  sexe: "F" | "M";
  age: number;
  libelleAge: string;
  codeCourt: string;
  telephone: string | null;
  village: string | null;
}

/** Une case : nom (sans accent, en désordre), téléphone ou code du carnet ; seulement les patients du centre. */
export async function rechercherPatients(db: Db, etablissementId: string, saisie: string, aujourdhui: DateISO): Promise<PatientTrouve[]> {
  const recherche = analyserRecherche(saisie);
  if (!recherche.telephone && !recherche.code && recherche.mots.length === 0) return [];
  const liste = await db
    .select({
      id: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
      codeCourt: patients.codeCourt,
      village: foyers.village,
    })
    .from(patients)
    .leftJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(eq(patients.etablissementId, etablissementId));
  const telephones = await telephonesPrincipaux(db, liste.map((p) => p.id));
  return liste
    .filter(
      (p) =>
        (recherche.telephone !== null && telephones.get(p.id) === recherche.telephone) ||
        (recherche.code !== null && p.codeCourt === recherche.code) ||
        correspondAuNom(p, recherche.mots),
    )
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"))
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      sexe: p.sexe,
      age: ageEnAnnees(p.dateNaissance, aujourdhui),
      libelleAge: libelleAge(p.dateNaissance, aujourdhui),
      codeCourt: p.codeCourt,
      telephone: telephones.get(p.id) ?? null,
      village: p.village,
    }));
}

export interface VisiteRelais {
  id: string;
  le: Date;
  constat: ConstatVisite;
  texte: string | null;
  relais: string;
  /** Une note vocale est arrivée : elle s'écoute par /api/fichiers/[id]. */
  note: boolean;
}

/** Les visites à domicile du relais, les plus récentes d'abord. */
export async function visitesDe(db: Db, patientId: string): Promise<VisiteRelais[]> {
  const lignes = await db
    .select({ id: evenements.id, le: evenements.survenuLe, donnees: evenements.donnees, relais: comptes.nomAffiche, note: fichiers.evenementId })
    .from(evenements)
    .leftJoin(comptes, eq(evenements.auteurId, comptes.id))
    .leftJoin(fichiers, eq(fichiers.evenementId, evenements.id))
    .where(and(eq(evenements.patientId, patientId), eq(evenements.type, "visite_domicile")))
    .orderBy(desc(evenements.survenuLe))
    .limit(10);
  return lignes.map((l) => ({
    id: l.id,
    le: l.le,
    constat: l.donnees.constat as ConstatVisite,
    texte: typeof l.donnees.texte === "string" ? l.donnees.texte : null,
    relais: l.relais ?? "Relais",
    note: l.note !== null,
  }));
}

export interface Dossier {
  patient: PatientTrouve & {
    langue: string;
    canalPrefere: string;
    malvoyant: boolean;
    malentendant: boolean;
  };
  risque: RisquePatient;
  programmes: ProgrammeDuCarnet[];
  mesures: MesureDatee[];
  ordonnances: OrdonnanceDetaillee[];
  alertesOuvertes: number;
  visites: VisiteRelais[];
}

/** Dossier d'un patient du centre ; null pour un patient d'un autre centre. */
export async function dossierPatient(db: Db, etablissementId: string, patientId: string, aujourdhui: DateISO): Promise<Dossier | null> {
  if (!(await patientDuCentre(db, etablissementId, patientId))) return null;
  const [p] = await db
    .select({
      id: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
      antecedents: patients.antecedents,
      codeCourt: patients.codeCourt,
      langue: patients.langue,
      canalPrefere: patients.canalPrefere,
      malvoyant: patients.malvoyant,
      malentendant: patients.malentendant,
      village: foyers.village,
    })
    .from(patients)
    .leftJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(eq(patients.id, patientId));
  if (!p) return null;
  const [telephones, risques, programmes, mesures, lesOrdonnances, ouvertes, visites] = await Promise.all([
    telephonesPrincipaux(db, [p.id]),
    risquesDes(db, [p], aujourdhui),
    programmesDuCarnet(db, p.id, aujourdhui),
    mesuresDes(db, [p.id]),
    ordonnancesDe(db, p.id),
    db
      .select({ id: alertes.id })
      .from(alertes)
      .where(and(eq(alertes.patientId, p.id), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe))),
    visitesDe(db, p.id),
  ]);
  return {
    patient: {
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      sexe: p.sexe,
      age: ageEnAnnees(p.dateNaissance, aujourdhui),
      libelleAge: libelleAge(p.dateNaissance, aujourdhui),
      codeCourt: p.codeCourt,
      telephone: telephones.get(p.id) ?? null,
      village: p.village,
      langue: p.langue,
      canalPrefere: p.canalPrefere,
      malvoyant: p.malvoyant,
      malentendant: p.malentendant,
    },
    risque: risques.get(p.id) ?? { global: { niveau: "normal", motifs: [] }, programmes: [] },
    programmes,
    mesures: mesures.get(p.id) ?? [],
    ordonnances: lesOrdonnances,
    alertesOuvertes: ouvertes.length,
    visites,
  };
}
