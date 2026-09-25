import { planifier } from "@/domain/calendrier";
import type { DateISO } from "@/domain/dates";
import { PROGRAMMES, type CodeProgramme } from "@/domain/programmes";
import type { Db } from "./db/client";
import { inscriptions, rendezVous } from "./db/schema";

/** Inscrit la personne à un programme de suivi et prévoit ses rendez-vous, sans place réservée. Accepte une transaction. */
export async function inscrireAuProgramme(
  db: Pick<Db, "insert">,
  e: {
    patientId: string;
    etablissementId: string;
    programme: CodeProgramme;
    dateReference: DateISO;
    dateInscription: DateISO;
    source: "programme" | "relais";
  },
): Promise<string> {
  const [inscription] = await db
    .insert(inscriptions)
    .values({ patientId: e.patientId, programme: e.programme, dateReference: e.dateReference, dateInscription: e.dateInscription })
    .returning({ id: inscriptions.id });
  const etapes = planifier(PROGRAMMES[e.programme], e.dateReference, e.dateInscription).filter((etape) => etape.rendezVous);
  if (etapes.length) {
    await db.insert(rendezVous).values(
      etapes.map((etape) => ({
        patientId: e.patientId,
        inscriptionId: inscription!.id,
        etapeCode: etape.code,
        motif: etape.motif,
        datePrevue: etape.datePrevue,
        moment: "matin" as const,
        etablissementId: e.etablissementId,
        source: e.source,
      })),
    );
  }
  return inscription!.id;
}
