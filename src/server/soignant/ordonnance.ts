import { genererCodeRetrait } from "@/domain/ordonnances";
import type { LigneTraitement } from "@/domain/traitements";
import type { Db } from "../db/client";
import { ordonnances } from "../db/schema";
import { patientDuCentre } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";
import type { Soignant } from "./consultation";

/** Ordonnance à posologie structurée ; le code de retrait est unique (nouvel essai si le code tiré existe déjà). */
export async function emettreOrdonnance(
  db: Db,
  e: { auteur: Soignant; patientId: string; lignes: LigneTraitement[]; maintenant?: Date; genererCode?: () => string },
): Promise<Resultat<{ ordonnanceId: string; codeRetrait: string }, "interdit" | "code_indisponible">> {
  if (!(await patientDuCentre(db, e.auteur.etablissementId, e.patientId))) return echec("interdit");
  const generer = e.genererCode ?? (() => genererCodeRetrait());
  for (let essai = 0; essai < 5; essai++) {
    const codeRetrait = generer();
    const [cree] = await db
      .insert(ordonnances)
      .values({ patientId: e.patientId, prescripteurId: e.auteur.id, lignes: e.lignes, codeRetrait, emiseLe: e.maintenant ?? new Date() })
      .onConflictDoNothing({ target: ordonnances.codeRetrait })
      .returning({ id: ordonnances.id });
    if (cree) return reussite({ ordonnanceId: cree.id, codeRetrait });
  }
  return echec("code_indisponible");
}
