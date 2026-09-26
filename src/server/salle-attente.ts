import { and, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { aujourdhuiAuBenin, type DateISO } from "@/domain/dates";
import { fileDAttente, placeDe, type Place } from "@/domain/salle-attente";
import { debutDuJourAuBenin } from "@/domain/temps";
import type { Db } from "./db/client";
import { alertes, passages, patients, rendezVous } from "./db/schema";
import { lienAvecPatient } from "./droits";
import { echec, reussite, type Resultat } from "./resultat";
import type { Soignant } from "./soignant/consultation";

/**
 * « Je suis arrivé au centre » : un numéro de passage, le même si on touche deux fois.
 * Une personne qui a une alerte en cours passe devant. Deux arrivées au même instant n'ont jamais le même numéro.
 */
export async function arriverAuCentre(
  db: Db,
  e: { compteId: string; patientId: string; maintenant?: Date },
): Promise<Resultat<{ numero: number }, "interdit">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  const maintenant = e.maintenant ?? new Date();
  const jour = aujourdhuiAuBenin(maintenant);
  const [patient] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.id, e.patientId));
  if (!patient) return echec("interdit");
  const centreDuJour = and(eq(passages.etablissementId, patient.etablissementId), eq(passages.jour, jour));
  const dejaLa = async () => (await db.select({ numero: passages.numero }).from(passages).where(and(centreDuJour, eq(passages.patientId, e.patientId))))[0];
  const deja = await dejaLa();
  if (deja) return reussite({ numero: deja.numero });
  const ouvertes = await db
    .select({ id: alertes.id })
    .from(alertes)
    .where(and(eq(alertes.patientId, e.patientId), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe)))
    .limit(1);
  for (let essai = 0; essai < 5; essai++) {
    const [ligne] = await db.select({ dernier: sql<number>`coalesce(max(${passages.numero}), 0)` }).from(passages).where(centreDuJour);
    const insere = await db
      .insert(passages)
      .values({ etablissementId: patient.etablissementId, patientId: e.patientId, jour, numero: Number(ligne?.dernier ?? 0) + 1, urgent: ouvertes.length > 0, arriveLe: maintenant })
      .onConflictDoNothing()
      .returning({ numero: passages.numero });
    if (insere[0]) return reussite({ numero: insere[0].numero });
    // Conflit : soit un double appui (le numéro existe déjà), soit une autre arrivée au même instant (on reprend le suivant).
    const entreTemps = await dejaLa();
    if (entreTemps) return reussite({ numero: entreTemps.numero });
  }
  throw new Error("Aucun numéro de passage libre après 5 essais.");
}

export interface EnAttente {
  passageId: string;
  patientId: string;
  numero: number;
  prenom: string;
  nom: string;
  urgent: boolean;
  arriveLe: Date;
}

/** La salle d'attente du jour, dans l'ordre de passage : les urgences d'abord. */
export async function salleAttente(db: Db, etablissementId: string, jour: DateISO): Promise<EnAttente[]> {
  const lignes = await db
    .select({
      id: passages.id,
      patientId: passages.patientId,
      numero: passages.numero,
      urgent: passages.urgent,
      arriveLe: passages.arriveLe,
      appeleLe: passages.appeleLe,
      prenom: patients.prenom,
      nom: patients.nom,
    })
    .from(passages)
    .innerJoin(patients, eq(passages.patientId, patients.id))
    .where(and(eq(passages.etablissementId, etablissementId), eq(passages.jour, jour)));
  return fileDAttente(lignes).map((l) => ({ passageId: l.id, patientId: l.patientId, numero: l.numero, prenom: l.prenom, nom: l.nom, urgent: l.urgent, arriveLe: l.arriveLe }));
}

/** « Appeler le suivant » : la première personne de la file ; deux soignants au même instant n'appellent pas la même. */
export async function appelerSuivant(
  db: Db,
  e: { soignant: Soignant; maintenant?: Date },
): Promise<Resultat<{ patientId: string; numero: number; prenom: string }, "vide">> {
  if (!e.soignant.etablissementId) return echec("vide");
  const maintenant = e.maintenant ?? new Date();
  const jour = aujourdhuiAuBenin(maintenant);
  for (let essai = 0; essai < 5; essai++) {
    const [suivant] = await salleAttente(db, e.soignant.etablissementId, jour);
    if (!suivant) return echec("vide");
    const pris = await db
      .update(passages)
      .set({ appeleLe: maintenant, appelePar: e.soignant.id })
      .where(and(eq(passages.id, suivant.passageId), isNull(passages.appeleLe)))
      .returning({ id: passages.id });
    if (pris.length) return reussite({ patientId: suivant.patientId, numero: suivant.numero, prenom: suivant.prenom });
  }
  return echec("vide");
}

/** Pour l'accueil du patient : la place de chacun dans la salle d'attente du jour. */
export async function placesDuJour(db: Db, patientIds: string[], jour: DateISO): Promise<Map<string, Place>> {
  const resultat = new Map<string, Place>();
  if (patientIds.length === 0) return resultat;
  const miens = await db
    .select({ patientId: passages.patientId, etablissementId: passages.etablissementId })
    .from(passages)
    .where(and(inArray(passages.patientId, patientIds), eq(passages.jour, jour)));
  if (miens.length === 0) return resultat;
  const tous = await db
    .select()
    .from(passages)
    .where(and(inArray(passages.etablissementId, [...new Set(miens.map((m) => m.etablissementId))]), eq(passages.jour, jour)));
  for (const m of miens) {
    const place = placeDe(
      tous.filter((p) => p.etablissementId === m.etablissementId),
      m.patientId,
    );
    if (place) resultat.set(m.patientId, place);
  }
  return resultat;
}

/** Qui peut dire « Je suis arrivé » aujourd'hui : une place réservée ce jour, ou une alerte du jour (elle passera devant). */
export async function peuventArriver(db: Db, patientIds: string[], jour: DateISO): Promise<Set<string>> {
  if (patientIds.length === 0) return new Set();
  const [rdvs, signalees] = await Promise.all([
    db
      .select({ patientId: rendezVous.patientId })
      .from(rendezVous)
      .where(and(inArray(rendezVous.patientId, patientIds), eq(rendezVous.datePrevue, jour), isNotNull(rendezVous.creneauId), isNull(rendezVous.annuleLe))),
    db
      .select({ patientId: alertes.patientId })
      .from(alertes)
      .where(and(inArray(alertes.patientId, patientIds), gte(alertes.creeeLe, debutDuJourAuBenin(jour)), isNull(alertes.annuleeLe))),
  ]);
  return new Set([...rdvs, ...signalees].map((x) => x.patientId));
}
