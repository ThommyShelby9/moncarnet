import { and, asc, count, eq, isNotNull, isNull } from "drizzle-orm";
import { joursEntre, type DateISO } from "@/domain/dates";
import { estUuid } from "@/domain/identifiants";
import type { MotifRdv } from "@/domain/programmes";
import { motifDePlage } from "@/domain/rendez-vous";
import type { Db } from "../db/client";
import { creneaux, listeAttente, patients, rendezVous } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { cleEtape, etapesFaites } from "../requetes/etapes-faites";
import { echec, reussite, type Resultat } from "../resultat";

/** Écart maximal entre la date prévue d'une étape et le jour choisi pour qu'on les relie. */
const ECART_ETAPE_JOURS = 30;

export type ErreurReservation = "interdit" | "introuvable" | "passe" | "complet" | "deja_reserve";
type ResultatReservation = Resultat<{ rendezVousId: string }, ErreurReservation>;

export async function reserver(
  db: Db,
  e: { compteId: string; patientId: string; motif: MotifRdv; creneauId: string; aujourdhui: DateISO; maintenant?: Date },
): Promise<ResultatReservation> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  if (!estUuid(e.creneauId)) return echec("introuvable");
  const [patient] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.id, e.patientId));
  const faites = (await etapesFaites(db, [e.patientId])).get(e.patientId);
  const maintenant = e.maintenant ?? new Date();

  return db.transaction(async (tx): Promise<ResultatReservation> => {
    // Verrou sur le créneau : deux réservations de la dernière place passent l'une après l'autre.
    const [creneau] = await tx.select().from(creneaux).where(eq(creneaux.id, e.creneauId)).for("update");
    if (!creneau || creneau.motif !== motifDePlage(e.motif) || creneau.etablissementId !== patient?.etablissementId) return echec("introuvable");
    if (joursEntre(e.aujourdhui, creneau.date) < 1) return echec("passe");

    const [occupation] = await tx
      .select({ reserves: count() })
      .from(rendezVous)
      .where(and(eq(rendezVous.creneauId, creneau.id), isNull(rendezVous.annuleLe)));
    if ((occupation?.reserves ?? 0) >= creneau.capacite) return echec("complet");

    const memeJour = await tx
      .select({ id: rendezVous.id })
      .from(rendezVous)
      .where(and(eq(rendezVous.patientId, e.patientId), eq(rendezVous.datePrevue, creneau.date), isNotNull(rendezVous.creneauId), isNull(rendezVous.annuleLe)))
      .limit(1);
    if (memeJour.length > 0) return echec("deja_reserve");

    const place = { datePrevue: creneau.date, moment: creneau.moment, creneauId: creneau.id, reserveLe: maintenant };
    const enAttente = await tx
      .select({ id: rendezVous.id, etapeCode: rendezVous.etapeCode, datePrevue: rendezVous.datePrevue })
      .from(rendezVous)
      .where(
        and(
          eq(rendezVous.patientId, e.patientId),
          eq(rendezVous.motif, e.motif),
          eq(rendezVous.source, "programme"),
          isNull(rendezVous.creneauId),
          isNull(rendezVous.annuleLe),
        ),
      )
      .orderBy(asc(rendezVous.datePrevue));
    const etape = enAttente.find(
      (r) => r.etapeCode && !faites?.has(cleEtape(e.motif, r.etapeCode)) && Math.abs(joursEntre(r.datePrevue, creneau.date)) <= ECART_ETAPE_JOURS,
    );
    if (etape) {
      await tx.update(rendezVous).set(place).where(eq(rendezVous.id, etape.id));
      return reussite({ rendezVousId: etape.id });
    }
    const [cree] = await tx
      .insert(rendezVous)
      .values({ ...place, patientId: e.patientId, motif: e.motif, etablissementId: creneau.etablissementId, source: "patient" })
      .returning({ id: rendezVous.id });
    return reussite({ rendezVousId: cree!.id });
  });
}

/** Demande une place sur un créneau complet ; la même demande deux fois n'en fait qu'une. */
export async function inscrireListeAttente(
  db: Db,
  e: { compteId: string; patientId: string; motif: MotifRdv; creneauId: string },
): Promise<Resultat<{ attenteId: string }, "interdit" | "introuvable">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  if (!estUuid(e.creneauId)) return echec("introuvable");
  const [creneau] = await db.select().from(creneaux).where(eq(creneaux.id, e.creneauId));
  if (!creneau || creneau.motif !== motifDePlage(e.motif)) return echec("introuvable");
  const souhait = { patientId: e.patientId, etablissementId: creneau.etablissementId, motif: e.motif, dateSouhaitee: creneau.date, moment: creneau.moment };
  const [existante] = await db
    .select({ id: listeAttente.id })
    .from(listeAttente)
    .where(
      and(
        eq(listeAttente.patientId, souhait.patientId),
        eq(listeAttente.motif, souhait.motif),
        eq(listeAttente.dateSouhaitee, souhait.dateSouhaitee),
        eq(listeAttente.moment, souhait.moment),
        eq(listeAttente.statut, "en_attente"),
      ),
    );
  if (existante) return reussite({ attenteId: existante.id });
  const [cree] = await db.insert(listeAttente).values(souhait).returning({ id: listeAttente.id });
  return reussite({ attenteId: cree!.id });
}
