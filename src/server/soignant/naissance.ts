import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { aujourdhuiAuBenin } from "@/domain/dates";
import type { DeclarationNaissance } from "@/domain/naissance";
import { codeDuCarnetLibre } from "../codes";
import type { Db } from "../db/client";
import { contacts, evenements, inscriptions, patients, responsables } from "../db/schema";
import { patientDuCentre } from "../droits";
import { inscrireAuProgramme } from "../inscriptions";
import { echec, reussite, type Resultat } from "../resultat";
import type { Soignant } from "./consultation";

/**
 * Naissance déclarée par la sage-femme : la grossesse se clôt, le suivi après l'accouchement commence pour la mère,
 * et le carnet du bébé est créé, rattaché à la famille, avec son calendrier de vaccins (spec §4.9).
 */
export async function declarerNaissance(
  db: Db,
  e: { auteur: Soignant; mereId: string; saisie: DeclarationNaissance; bebeId?: string; evenementId?: string },
): Promise<Resultat<{ bebeId: string }, "interdit" | "pas_de_grossesse">> {
  if (!(await patientDuCentre(db, e.auteur.etablissementId, e.mereId))) return echec("interdit");
  const [grossesse] = await db
    .select({ id: inscriptions.id })
    .from(inscriptions)
    .where(and(eq(inscriptions.patientId, e.mereId), eq(inscriptions.programme, "grossesse"), eq(inscriptions.active, true)));
  if (!grossesse) return echec("pas_de_grossesse");
  const [mere] = await db.select().from(patients).where(eq(patients.id, e.mereId));
  if (!mere) return echec("interdit");
  const [liens, telephones, codeCourt] = await Promise.all([
    db.select({ compteId: responsables.compteId, lien: responsables.lien }).from(responsables).where(eq(responsables.patientId, e.mereId)),
    db.select({ telephone: contacts.telephone }).from(contacts).where(and(eq(contacts.patientId, e.mereId), eq(contacts.role, "principal"))),
    codeDuCarnetLibre(db),
  ]);
  const s = e.saisie;
  const bebeId = e.bebeId ?? randomUUID();
  const dateNaissance = aujourdhuiAuBenin(s.le);

  return db.transaction(async (tx) => {
    // Deux déclarations en même temps : une seule clôt la grossesse.
    const close = await tx
      .update(inscriptions)
      .set({ active: false })
      .where(and(eq(inscriptions.id, grossesse.id), eq(inscriptions.active, true)))
      .returning({ id: inscriptions.id });
    if (close.length === 0) return echec("pas_de_grossesse");
    await tx.insert(evenements).values({
      id: e.evenementId ?? randomUUID(),
      patientId: e.mereId,
      type: "accouchement",
      auteurId: e.auteur.id,
      survenuLe: s.le,
      donnees: { le: s.le.toISOString(), lieu: s.lieu, mode: s.mode, enfant: { id: bebeId, sexe: s.sexe, poidsGrammes: s.poidsGrammes } },
    });
    await inscrireAuProgramme(tx, {
      patientId: e.mereId,
      etablissementId: mere.etablissementId,
      programme: "postnatal",
      dateReference: dateNaissance,
      dateInscription: dateNaissance,
      source: "programme",
    });
    await tx.insert(patients).values({
      id: bebeId,
      foyerId: mere.foyerId,
      prenom: s.prenom ?? "Bébé",
      nom: mere.nom,
      dateNaissance,
      sexe: s.sexe,
      langue: mere.langue,
      canalPrefere: mere.canalPrefere,
      codeCourt,
      etablissementId: mere.etablissementId,
      mereId: e.mereId,
    });
    if (telephones[0]) await tx.insert(contacts).values({ patientId: bebeId, telephone: telephones[0].telephone, role: "principal", proprietaire: "proche" });
    if (liens.length) {
      await tx.insert(responsables).values(liens.map((l) => ({ compteId: l.compteId, patientId: bebeId, lien: l.lien === "soi" ? ("parent" as const) : ("aidant" as const) })));
    }
    await inscrireAuProgramme(tx, {
      patientId: bebeId,
      etablissementId: mere.etablissementId,
      programme: "vaccination",
      dateReference: dateNaissance,
      dateInscription: dateNaissance,
      source: "programme",
    });
    await tx.insert(evenements).values({
      id: randomUUID(),
      patientId: bebeId,
      type: "mesure",
      auteurId: e.auteur.id,
      survenuLe: s.le,
      donnees: { mesures: { poidsKg: s.poidsGrammes / 1000 } },
    });
    if (s.vaccinsNaissance) {
      await tx.insert(evenements).values({
        id: randomUUID(),
        patientId: bebeId,
        type: "vaccination",
        auteurId: e.auteur.id,
        survenuLe: s.le,
        donnees: { etape: "naissance", vaccins: ["BCG", "VPO0"] },
      });
    }
    return reussite({ bebeId });
  });
}
