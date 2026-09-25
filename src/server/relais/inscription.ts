import { and, eq } from "drizzle-orm";
import type { DateISO } from "@/domain/dates";
import type { InscriptionDonnees } from "@/domain/evenements";
import { codeDuCarnetLibre } from "../codes";
import type { Db } from "../db/client";
import { consentements, contacts, etablissements, evenements, foyers, patients } from "../db/schema";
import { foyerDuRelais } from "../droits";
import { inscrireAuProgramme } from "../inscriptions";
import { echec, reussite, type Resultat } from "../resultat";

export type RefusInscription = "foyer_hors_tournee" | "sans_centre" | "identifiant_pris";

/**
 * Personne inscrite par le relais pendant sa tournée, parfois sans réseau.
 * Son identifiant vient du téléphone : renvoyer l'inscription ne crée pas un deuxième carnet.
 */
export async function inscrirePersonne(
  db: Db,
  e: { relaisId: string; patientId: string; evenementId: string; donnees: InscriptionDonnees; survenuLe: Date; aujourdhui: DateISO },
): Promise<Resultat<"accepte" | "deja_recu", RefusInscription>> {
  const d = e.donnees;
  if (!(await foyerDuRelais(db, e.relaisId, d.foyerId))) return echec("foyer_hors_tournee");
  const [existant] = await db.select({ foyerId: patients.foyerId }).from(patients).where(eq(patients.id, e.patientId));
  if (existant) return existant.foyerId === d.foyerId ? reussite("deja_recu") : echec("identifiant_pris");
  const etablissementId = await centreDuFoyer(db, d.foyerId);
  if (!etablissementId) return echec("sans_centre");
  const codeCourt = await codeDuCarnetLibre(db);

  await db.transaction(async (tx) => {
    await tx.insert(patients).values({
      id: e.patientId,
      foyerId: d.foyerId,
      prenom: d.prenom,
      nom: d.nom,
      sexe: d.sexe,
      dateNaissance: d.dateNaissance,
      canalPrefere: d.telephone ? "sms" : "relais",
      codeCourt,
      etablissementId,
    });
    if (d.telephone) {
      await tx.insert(contacts).values({ patientId: e.patientId, telephone: d.telephone, role: "principal", proprietaire: "soi" });
      await tx.insert(consentements).values({ patientId: e.patientId, canal: "sms", recueilliPar: e.relaisId });
    }
    if (d.programme) {
      await inscrireAuProgramme(tx, {
        patientId: e.patientId,
        etablissementId,
        programme: d.programme.code,
        dateReference: d.programme.dateReference,
        dateInscription: e.aujourdhui,
        source: "relais",
      });
    }
    await tx.insert(evenements).values({ id: e.evenementId, patientId: e.patientId, type: "inscription", auteurId: e.relaisId, survenuLe: e.survenuLe, donnees: d });
  });
  return reussite("accepte");
}

/** Le centre des autres personnes du foyer, sinon le premier centre de santé de sa commune. */
async function centreDuFoyer(db: Db, foyerId: string): Promise<string | null> {
  const [voisin] = await db.select({ id: patients.etablissementId }).from(patients).where(eq(patients.foyerId, foyerId)).limit(1);
  if (voisin) return voisin.id;
  const [centre] = await db
    .select({ id: etablissements.id })
    .from(foyers)
    .innerJoin(etablissements, and(eq(etablissements.communeId, foyers.communeId), eq(etablissements.type, "centre_sante")))
    .where(eq(foyers.id, foyerId))
    .limit(1);
  return centre?.id ?? null;
}
