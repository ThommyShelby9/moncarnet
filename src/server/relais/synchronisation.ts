import { eq } from "drizzle-orm";
import type { DateISO } from "@/domain/dates";
import { evenementSchema } from "@/domain/evenements";
import { dateAcceptable, evenementEntrantSchema, MAX_LOT, type ResultatSync } from "@/domain/synchronisation";
import type { Db } from "../db/client";
import { evenements } from "../db/schema";
import { patientDuRelais } from "../droits";
import { enregistrerSignalement } from "../patient/signalement";
import { inscrirePersonne } from "./inscription";

const TYPES_DU_RELAIS = new Set(["visite_domicile", "mesure", "signalement_danger", "inscription"]);

/** Raisons lues par le relais dans « À corriger » : elles disent quoi faire. */
export const MOTIFS_REFUS = {
  illisible: "Saisie illisible : refaites-la.",
  date: "La date du téléphone semble fausse : réglez la date et l'heure, puis refaites la saisie.",
  incomplete: "Saisie incomplète : refaites-la.",
  type: "Ce type de saisie n'est pas permis au relais.",
  hors_tournee: "Cette personne n'est pas dans votre tournée.",
  foyer_hors_tournee: "Ce foyer n'est pas dans votre tournée.",
  sans_centre: "Aucun centre de santé pour ce foyer : voyez avec le centre.",
  identifiant_pris: "Cette saisie porte l'identifiant d'une autre : refaites-la.",
} as const;

interface Contexte {
  relaisId: string;
  maintenant: Date;
  aujourdhui: DateISO;
}

/**
 * Reçoit la file d'envoi du relais, saisie par saisie et dans l'ordre : une inscription passe avant la visite de la personne inscrite.
 * Chaque saisie reçoit une réponse : reçue, déjà reçue (renvoi après une coupure), ou refusée avec sa raison (spec §10.2).
 */
export async function synchroniser(db: Db, e: Contexte & { lot: unknown[] }): Promise<ResultatSync[]> {
  const resultats: ResultatSync[] = [];
  for (const brut of e.lot.slice(0, MAX_LOT)) resultats.push(await traiter(db, e, brut));
  return resultats;
}

async function traiter(db: Db, e: Contexte, brut: unknown): Promise<ResultatSync> {
  const lecture = evenementEntrantSchema.safeParse(brut);
  const id = lecture.success ? lecture.data.id : String((brut as { id?: unknown } | null)?.id ?? "");
  const refus = (motif: string): ResultatSync => ({ id, statut: "refuse", motif });
  if (!lecture.success) return refus(MOTIFS_REFUS.illisible);
  const saisie = lecture.data;
  const survenuLe = new Date(saisie.survenuLe);
  if (!dateAcceptable(survenuLe, e.maintenant)) return refus(MOTIFS_REFUS.date);
  if (!TYPES_DU_RELAIS.has(saisie.type)) return refus(MOTIFS_REFUS.type);
  const evenement = evenementSchema.safeParse({ type: saisie.type, donnees: saisie.donnees });
  if (!evenement.success) return refus(MOTIFS_REFUS.incomplete);

  const [deja] = await db.select({ patientId: evenements.patientId }).from(evenements).where(eq(evenements.id, saisie.id));
  if (deja) return deja.patientId === saisie.patientId ? { id, statut: "deja_recu" } : refus(MOTIFS_REFUS.identifiant_pris);

  const valide = evenement.data;
  if (valide.type === "inscription") {
    const r = await inscrirePersonne(db, {
      relaisId: e.relaisId,
      patientId: saisie.patientId,
      evenementId: saisie.id,
      donnees: valide.donnees,
      survenuLe,
      aujourdhui: e.aujourdhui,
    });
    return r.ok ? { id, statut: r.donnees } : refus(MOTIFS_REFUS[r.erreur]);
  }
  if (!(await patientDuRelais(db, e.relaisId, saisie.patientId))) return refus(MOTIFS_REFUS.hors_tournee);
  if (valide.type === "signalement_danger") {
    const r = await enregistrerSignalement(db, {
      patientId: saisie.patientId,
      evenementId: saisie.id,
      auteurId: e.relaisId,
      signes: valide.donnees.signes,
      source: "relais",
      survenuLe,
      maintenant: e.maintenant,
    });
    return r.ok ? { id, statut: "accepte" } : refus(MOTIFS_REFUS.incomplete);
  }
  await db
    .insert(evenements)
    .values({ id: saisie.id, patientId: saisie.patientId, type: valide.type, auteurId: e.relaisId, survenuLe, donnees: valide.donnees })
    .onConflictDoNothing({ target: evenements.id });
  return { id, statut: "accepte" };
}
