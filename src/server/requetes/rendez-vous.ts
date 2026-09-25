import { and, asc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { RendezVousVu } from "@/domain/cartes-du-jour";
import type { DateISO } from "@/domain/dates";
import { PROGRAMMES, type MotifRdv } from "@/domain/programmes";
import { LIBELLES_RDV, type CreneauVu } from "@/domain/rendez-vous";
import type { Db } from "../db/client";
import { creneaux, etablissements, inscriptions, listeAttente, rendezVous } from "../db/schema";
import { cleEtape, etapesFaites } from "./etapes-faites";

export interface RendezVousDetaille extends RendezVousVu {
  etablissement: string;
}

/** Rendez-vous non annulés depuis une date, nommés d'après l'étape de leur programme, avec l'étape faite ou non. */
export async function rendezVousVus(db: Db, patientIds: string[], depuis: DateISO): Promise<RendezVousDetaille[]> {
  if (patientIds.length === 0) return [];
  const [lignes, faites] = await Promise.all([
    db
      .select({
        id: rendezVous.id,
        patientId: rendezVous.patientId,
        motif: rendezVous.motif,
        etapeCode: rendezVous.etapeCode,
        datePrevue: rendezVous.datePrevue,
        moment: rendezVous.moment,
        creneauId: rendezVous.creneauId,
        source: rendezVous.source,
        programme: inscriptions.programme,
        dateReference: inscriptions.dateReference,
        dateInscription: inscriptions.dateInscription,
        etablissement: etablissements.nom,
      })
      .from(rendezVous)
      .leftJoin(inscriptions, eq(rendezVous.inscriptionId, inscriptions.id))
      .innerJoin(etablissements, eq(rendezVous.etablissementId, etablissements.id))
      .where(and(inArray(rendezVous.patientId, patientIds), isNull(rendezVous.annuleLe), gte(rendezVous.datePrevue, depuis)))
      .orderBy(asc(rendezVous.datePrevue)),
    etapesFaites(db, patientIds),
  ]);
  return lignes.map((l) => {
    const etape =
      l.etapeCode && l.programme && l.dateReference && l.dateInscription
        ? PROGRAMMES[l.programme].etapes(l.dateReference, l.dateInscription).find((d) => d.code === l.etapeCode)
        : undefined;
    return {
      id: l.id,
      patientId: l.patientId,
      motif: l.motif,
      libelle: etape?.libelle ?? LIBELLES_RDV[l.motif],
      datePrevue: l.datePrevue,
      moment: l.moment,
      reserve: l.creneauId !== null,
      programme: l.source === "programme" && l.etapeCode !== null,
      faite: l.etapeCode !== null && (faites.get(l.patientId)?.has(cleEtape(l.motif, l.etapeCode)) ?? false),
      etablissement: l.etablissement,
    };
  });
}

/** Créneaux d'une plage avec le nombre de places déjà prises. */
export async function placesDisponibles(
  db: Db,
  filtre: { etablissementId: string; motif: MotifRdv; du: DateISO; au: DateISO },
): Promise<CreneauVu[]> {
  return db
    .select({
      id: creneaux.id,
      date: creneaux.date,
      moment: creneaux.moment,
      capacite: creneaux.capacite,
      reserves: sql<number>`count(${rendezVous.id})::int`,
    })
    .from(creneaux)
    .leftJoin(rendezVous, and(eq(rendezVous.creneauId, creneaux.id), isNull(rendezVous.annuleLe)))
    .where(
      and(
        eq(creneaux.etablissementId, filtre.etablissementId),
        eq(creneaux.motif, filtre.motif),
        gte(creneaux.date, filtre.du),
        lte(creneaux.date, filtre.au),
      ),
    )
    .groupBy(creneaux.id);
}

export interface AttenteVue {
  id: string;
  patientId: string;
  motif: MotifRdv;
  dateSouhaitee: DateISO;
  moment: "matin" | "apres_midi";
}

export async function listeAttenteDe(db: Db, patientIds: string[]): Promise<AttenteVue[]> {
  if (patientIds.length === 0) return [];
  return db
    .select({
      id: listeAttente.id,
      patientId: listeAttente.patientId,
      motif: listeAttente.motif,
      dateSouhaitee: listeAttente.dateSouhaitee,
      moment: listeAttente.moment,
    })
    .from(listeAttente)
    .where(and(inArray(listeAttente.patientId, patientIds), eq(listeAttente.statut, "en_attente")))
    .orderBy(asc(listeAttente.dateSouhaitee));
}
