import { and, asc, eq, isNull } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import type { DateISO } from "@/domain/dates";
import { PROGRAMMES, type CodeProgramme, type MotifRdv } from "@/domain/programmes";
import { statutEtape, type StatutEtape } from "@/domain/statuts";
import type { Db } from "../db/client";
import { inscriptions, rendezVous } from "../db/schema";
import { cleEtape, etapesFaites, type EtapeFaite } from "./etapes-faites";

export interface EtapeDuCarnet {
  code: string;
  libelle: string;
  details?: string;
  motif: MotifRdv;
  rendezVous: boolean;
  statut: StatutEtape;
  datePrevue: DateISO;
  faite: EtapeFaite | null;
  reservation: { date: DateISO; moment: "matin" | "apres_midi" | null } | null;
}

export interface ProgrammeDuCarnet {
  code: CodeProgramme;
  nom: string;
  dateReference: DateISO;
  etapes: EtapeDuCarnet[];
}

/** Programmes suivis par une personne, étape par étape : faite (avec le lieu), réservée, à venir ou manquée. */
export async function programmesDuCarnet(db: Db, patientId: string, aujourdhui: DateISO): Promise<ProgrammeDuCarnet[]> {
  const [lesInscriptions, rdvs, faites] = await Promise.all([
    db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.patientId, patientId), eq(inscriptions.active, true)))
      .orderBy(asc(inscriptions.creeLe)),
    db
      .select({
        inscriptionId: rendezVous.inscriptionId,
        etapeCode: rendezVous.etapeCode,
        datePrevue: rendezVous.datePrevue,
        moment: rendezVous.moment,
        creneauId: rendezVous.creneauId,
      })
      .from(rendezVous)
      .where(and(eq(rendezVous.patientId, patientId), isNull(rendezVous.annuleLe))),
    etapesFaites(db, [patientId]),
  ]);
  const faitesDuPatient = faites.get(patientId);
  return lesInscriptions.map((inscription) => ({
    code: inscription.programme,
    nom: PROGRAMMES[inscription.programme].nom,
    dateReference: inscription.dateReference,
    etapes: planifier(PROGRAMMES[inscription.programme], inscription.dateReference, inscription.dateInscription).map((etape) => {
      const faite = faitesDuPatient?.get(cleEtape(etape.motif, etape.code)) ?? null;
      const rdv = rdvs.find((r) => r.inscriptionId === inscription.id && r.etapeCode === etape.code);
      const reservation = rdv?.creneauId ? { date: rdv.datePrevue, moment: rdv.moment } : null;
      const statut: StatutEtape = faite
        ? "faite"
        : reservation && reservation.date >= aujourdhui
          ? "a_venir"
          : statutEtape(etape, false, aujourdhui);
      return {
        code: etape.code,
        libelle: etape.libelle,
        details: etape.details,
        motif: etape.motif,
        rendezVous: etape.rendezVous,
        statut,
        datePrevue: etape.datePrevue,
        faite,
        reservation,
      };
    }),
  }));
}
