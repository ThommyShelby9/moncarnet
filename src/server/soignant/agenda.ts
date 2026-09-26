import { and, asc, count, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { ajouterJours, depuisDateISO, type DateISO } from "@/domain/dates";
import { estUuid } from "@/domain/identifiants";
import { MOTIFS_RDV, type MotifRdv } from "@/domain/programmes/types";
import { motifDePlage } from "@/domain/rendez-vous";
import type { Db } from "../db/client";
import { creneaux, listeAttente, patients, rendezVous } from "../db/schema";
import { echec, reussite, type Resultat } from "../resultat";
import type { Soignant } from "./consultation";

export type MomentPlage = "matin" | "apres_midi";

export interface PlageAgenda {
  creneauId: string;
  date: DateISO;
  moment: MomentPlage;
  motif: MotifRdv;
  capacite: number;
  prises: number;
  enAttente: number;
}

/** Motifs qui ont leurs propres plages : la fièvre et les dents se voient pendant les consultations. */
export const MOTIFS_DE_PLAGE = MOTIFS_RDV.filter((m) => motifDePlage(m) === m);
export const CAPACITE_MAX = 60;
/** On n'ouvre pas de plage plus loin que deux mois : les modèles de la semaine s'en chargent. */
export const HORIZON_OUVERTURE = 60;

const cleDe = (motif: MotifRdv, date: DateISO, moment: MomentPlage) => `${motifDePlage(motif)}|${date}|${moment}`;

/** Les plages du centre, jour par jour, avec les places prises (hors annulations) et la liste d'attente. */
export async function agendaDuCentre(db: Db, etablissementId: string, du: DateISO, jours: number): Promise<PlageAgenda[]> {
  const au = ajouterJours(du, jours);
  const plages = await db
    .select()
    .from(creneaux)
    .where(and(eq(creneaux.etablissementId, etablissementId), gte(creneaux.date, du), lt(creneaux.date, au)))
    .orderBy(asc(creneaux.date), asc(creneaux.moment), asc(creneaux.motif));
  if (!plages.length) return [];
  const [prises, attente] = await Promise.all([
    db
      .select({ creneauId: rendezVous.creneauId, nombre: count() })
      .from(rendezVous)
      .where(and(inArray(rendezVous.creneauId, plages.map((p) => p.id)), isNull(rendezVous.annuleLe)))
      .groupBy(rendezVous.creneauId),
    db
      .select({ motif: listeAttente.motif, date: listeAttente.dateSouhaitee, moment: listeAttente.moment })
      .from(listeAttente)
      .where(and(eq(listeAttente.etablissementId, etablissementId), eq(listeAttente.statut, "en_attente"), gte(listeAttente.dateSouhaitee, du), lt(listeAttente.dateSouhaitee, au))),
  ]);
  const prisesPar = new Map(prises.map((p) => [p.creneauId, Number(p.nombre)]));
  const attentePar = new Map<string, number>();
  for (const a of attente) {
    const cle = cleDe(a.motif, a.date, a.moment);
    attentePar.set(cle, (attentePar.get(cle) ?? 0) + 1);
  }
  return plages.map((p) => ({
    creneauId: p.id,
    date: p.date,
    moment: p.moment,
    motif: p.motif,
    capacite: p.capacite,
    prises: prisesPar.get(p.id) ?? 0,
    enAttente: attentePar.get(cleDe(p.motif, p.date, p.moment)) ?? 0,
  }));
}

export interface InscritPlage {
  rendezVousId: string;
  patientId: string;
  prenom: string;
  nom: string;
  naissance: DateISO;
  motif: MotifRdv;
}

export interface AttentePlage {
  attenteId: string;
  patientId: string;
  prenom: string;
  nom: string;
  naissance: DateISO;
  motif: MotifRdv;
}

/** Une plage du centre : qui vient, qui attend une place. `null` si la plage n'est pas de ce centre. */
export async function detailPlage(
  db: Db,
  etablissementId: string,
  creneauId: string,
): Promise<{ plage: PlageAgenda; inscrits: InscritPlage[]; attente: AttentePlage[] } | null> {
  if (!estUuid(creneauId)) return null;
  const [creneau] = await db.select().from(creneaux).where(and(eq(creneaux.id, creneauId), eq(creneaux.etablissementId, etablissementId)));
  if (!creneau) return null;
  const plage = (await agendaDuCentre(db, etablissementId, creneau.date, 1)).find((p) => p.creneauId === creneauId)!;
  const personne = { patientId: patients.id, prenom: patients.prenom, nom: patients.nom, naissance: patients.dateNaissance };
  const [inscrits, enAttente] = await Promise.all([
    db
      .select({ rendezVousId: rendezVous.id, ...personne, motif: rendezVous.motif })
      .from(rendezVous)
      .innerJoin(patients, eq(patients.id, rendezVous.patientId))
      .where(and(eq(rendezVous.creneauId, creneauId), isNull(rendezVous.annuleLe)))
      .orderBy(asc(rendezVous.reserveLe), asc(rendezVous.creeLe)),
    db
      .select({ attenteId: listeAttente.id, ...personne, motif: listeAttente.motif })
      .from(listeAttente)
      .innerJoin(patients, eq(patients.id, listeAttente.patientId))
      .where(
        and(
          eq(listeAttente.etablissementId, etablissementId),
          eq(listeAttente.statut, "en_attente"),
          eq(listeAttente.dateSouhaitee, creneau.date),
          eq(listeAttente.moment, creneau.moment),
        ),
      )
      .orderBy(asc(listeAttente.creeLe)),
  ]);
  return { plage, inscrits, attente: enAttente.filter((a) => motifDePlage(a.motif) === creneau.motif) };
}

const capaciteValide = (capacite: number) => Number.isInteger(capacite) && capacite >= 1 && capacite <= CAPACITE_MAX;

/** Plus ou moins de places : jamais moins que les personnes déjà inscrites. */
export async function modifierCapacite(
  db: Db,
  e: { soignant: Soignant; creneauId: string; capacite: number },
): Promise<Resultat<{ capacite: number }, "interdit" | "trop_bas" | "invalide">> {
  if (!capaciteValide(e.capacite)) return echec("invalide");
  if (!e.soignant.etablissementId || !estUuid(e.creneauId)) return echec("interdit");
  return db.transaction(async (tx) => {
    const [creneau] = await tx
      .select({ id: creneaux.id })
      .from(creneaux)
      .where(and(eq(creneaux.id, e.creneauId), eq(creneaux.etablissementId, e.soignant.etablissementId!)))
      .for("update");
    if (!creneau) return echec("interdit");
    const [ligne] = await tx.select({ nombre: count() }).from(rendezVous).where(and(eq(rendezVous.creneauId, e.creneauId), isNull(rendezVous.annuleLe)));
    if (Number(ligne?.nombre ?? 0) > e.capacite) return echec("trop_bas");
    await tx.update(creneaux).set({ capacite: e.capacite }).where(eq(creneaux.id, e.creneauId));
    return reussite({ capacite: e.capacite });
  });
}

const dateValide = (d: string): boolean => {
  try {
    depuisDateISO(d);
    return true;
  } catch {
    return false;
  }
};

/** Une plage de plus (un samedi de vaccination, une matinée de rattrapage), dans les deux mois qui viennent. */
export async function ouvrirPlage(
  db: Db,
  e: { soignant: Soignant; date: DateISO; moment: MomentPlage; motif: MotifRdv; capacite: number; aujourdhui: DateISO },
): Promise<Resultat<{ creneauId: string }, "deja_ouverte" | "invalide">> {
  if (!e.soignant.etablissementId) return echec("invalide");
  if (!dateValide(e.date) || e.date < e.aujourdhui || e.date > ajouterJours(e.aujourdhui, HORIZON_OUVERTURE)) return echec("invalide");
  if (!(MOTIFS_DE_PLAGE as readonly string[]).includes(e.motif) || (e.moment !== "matin" && e.moment !== "apres_midi")) return echec("invalide");
  if (!capaciteValide(e.capacite)) return echec("invalide");
  const [cree] = await db
    .insert(creneaux)
    .values({ etablissementId: e.soignant.etablissementId, date: e.date, moment: e.moment, motif: e.motif, capacite: e.capacite })
    .onConflictDoNothing()
    .returning({ id: creneaux.id });
  return cree ? reussite({ creneauId: cree.id }) : echec("deja_ouverte");
}

/** Une place libre (capacité augmentée, annulation) va à une personne de la liste d'attente de la plage. */
export async function donnerPlace(
  db: Db,
  e: { soignant: Soignant; attenteId: string; creneauId: string; maintenant?: Date },
): Promise<Resultat<{ rendezVousId: string }, "interdit" | "introuvable" | "complet">> {
  if (!e.soignant.etablissementId || !estUuid(e.creneauId) || !estUuid(e.attenteId)) return echec("interdit");
  const maintenant = e.maintenant ?? new Date();
  return db.transaction(async (tx) => {
    // Verrou sur la plage : deux soignants ne donnent pas la même dernière place.
    const [creneau] = await tx
      .select()
      .from(creneaux)
      .where(and(eq(creneaux.id, e.creneauId), eq(creneaux.etablissementId, e.soignant.etablissementId!)))
      .for("update");
    if (!creneau) return echec("interdit");
    const [attente] = await tx
      .select()
      .from(listeAttente)
      .where(
        and(
          eq(listeAttente.id, e.attenteId),
          eq(listeAttente.etablissementId, creneau.etablissementId),
          eq(listeAttente.statut, "en_attente"),
          eq(listeAttente.dateSouhaitee, creneau.date),
          eq(listeAttente.moment, creneau.moment),
        ),
      );
    if (!attente || motifDePlage(attente.motif) !== creneau.motif) return echec("introuvable");
    const [ligne] = await tx.select({ nombre: count() }).from(rendezVous).where(and(eq(rendezVous.creneauId, creneau.id), isNull(rendezVous.annuleLe)));
    if (Number(ligne?.nombre ?? 0) >= creneau.capacite) return echec("complet");
    const [cree] = await tx
      .insert(rendezVous)
      .values({
        patientId: attente.patientId,
        motif: attente.motif,
        datePrevue: creneau.date,
        moment: creneau.moment,
        creneauId: creneau.id,
        etablissementId: creneau.etablissementId,
        source: "soignant",
        reserveLe: maintenant,
      })
      .returning({ id: rendezVous.id });
    await tx.update(listeAttente).set({ statut: "acceptee" }).where(eq(listeAttente.id, attente.id));
    return reussite({ rendezVousId: cree!.id });
  });
}
