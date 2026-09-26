import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { ageEnAnnees, joursEntre, libelleAge, type DateISO } from "@/domain/dates";
import { PROGRAMMES } from "@/domain/programmes";
import { statutEtape } from "@/domain/statuts";
import { debutDuJourAuBenin } from "@/domain/temps";
import { raisonsDe, trierFoyers, urgenceDuFoyer, type FoyerTournee, type Tournee } from "@/domain/tournee";
import type { Db } from "../db/client";
import { sansReponseAuTelephone } from "../rappels";
import { alertes, evenements, foyers, inscriptions, ordonnances, patients, rendezVous } from "../db/schema";
import { cleEtape, etapesFaites } from "./etapes-faites";
import { risquesDes } from "./risques";
import { telephonesPrincipaux } from "./soignant";

const RETARD_MAX_JOURS = 60;
const PROCHE_JOURS = 7;

/** Tournée du relais : ses foyers, chaque personne avec les raisons d'y passer, les foyers urgents d'abord. */
export async function tourneeDuRelais(db: Db, relaisId: string, relais: string, aujourdhui: DateISO, maintenant: Date): Promise<Tournee> {
  const lesFoyers = await db.select().from(foyers).where(eq(foyers.relaisId, relaisId));
  const tournee: Tournee = { relais, prepareeLe: maintenant.toISOString(), aujourdhui, foyers: [] };
  if (lesFoyers.length === 0) return tournee;
  const personnes = await db
    .select({
      id: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
      antecedents: patients.antecedents,
      malvoyant: patients.malvoyant,
      foyerId: patients.foyerId,
    })
    .from(patients)
    .where(inArray(patients.foyerId, lesFoyers.map((f) => f.id)));
  const ids = personnes.map((p) => p.id);
  const [telephones, lesInscriptions, faites, rdvs, risques, ouvertes, lesOrdonnances, delivrances, visites] = ids.length
    ? await Promise.all([
        telephonesPrincipaux(db, ids),
        db.select().from(inscriptions).where(and(inArray(inscriptions.patientId, ids), eq(inscriptions.active, true))),
        etapesFaites(db, ids),
        db
          .select({ inscriptionId: rendezVous.inscriptionId, etapeCode: rendezVous.etapeCode, datePrevue: rendezVous.datePrevue, creneauId: rendezVous.creneauId })
          .from(rendezVous)
          .where(and(inArray(rendezVous.patientId, ids), isNull(rendezVous.annuleLe))),
        risquesDes(db, personnes, aujourdhui),
        db
          .select({ patientId: alertes.patientId })
          .from(alertes)
          .where(and(inArray(alertes.patientId, ids), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe))),
        db.select({ id: ordonnances.id, patientId: ordonnances.patientId, code: ordonnances.codeRetrait }).from(ordonnances).where(inArray(ordonnances.patientId, ids)),
        db
          .select({ donnees: evenements.donnees })
          .from(evenements)
          .where(and(inArray(evenements.patientId, ids), eq(evenements.type, "delivrance"))),
        db
          .select({ patientId: evenements.patientId })
          .from(evenements)
          .where(
            and(inArray(evenements.patientId, ids), eq(evenements.type, "visite_domicile"), gte(evenements.survenuLe, debutDuJourAuBenin(aujourdhui))),
          ),
      ])
    : [new Map<string, string>(), [], new Map(), [], new Map(), [], [], [], []];
  const vues = new Set(visites.map((v) => v.patientId));
  const injoignables = await sansReponseAuTelephone(db, ids, aujourdhui);
  const delivrees = new Set(delivrances.map((d) => d.donnees.ordonnanceId));

  tournee.foyers = trierFoyers(
    lesFoyers.map((foyer): FoyerTournee => {
      const membres = personnes
        .filter((p) => p.foyerId === foyer.id)
        .map((p) => {
          const etapesManquees: string[] = [];
          const etapesProches: string[] = [];
          const sesInscriptions = lesInscriptions.filter((i) => i.patientId === p.id);
          for (const inscription of sesInscriptions) {
            for (const etape of planifier(PROGRAMMES[inscription.programme], inscription.dateReference, inscription.dateInscription)) {
              if (!etape.rendezVous || faites.get(p.id)?.has(cleEtape(etape.motif, etape.code))) continue;
              const reservee = rdvs.some(
                (r) => r.inscriptionId === inscription.id && r.etapeCode === etape.code && r.creneauId !== null && r.datePrevue >= aujourdhui,
              );
              if (reservee) continue;
              const statut = statutEtape(etape, false, aujourdhui);
              const ecart = joursEntre(aujourdhui, etape.datePrevue);
              if (statut === "manquee" && -ecart <= RETARD_MAX_JOURS) etapesManquees.push(etape.libelle);
              if (statut === "a_venir" && ecart >= 0 && ecart <= PROCHE_JOURS) etapesProches.push(etape.libelle);
            }
          }
          return {
            id: p.id,
            prenom: p.prenom,
            nom: p.nom,
            sexe: p.sexe,
            age: ageEnAnnees(p.dateNaissance, aujourdhui),
            libelleAge: libelleAge(p.dateNaissance, aujourdhui),
            telephone: telephones.get(p.id) ?? null,
            enceinte: sesInscriptions.some((i) => i.programme === "grossesse"),
            malvoyant: p.malvoyant,
            vueAujourdhui: vues.has(p.id),
            raisons: raisonsDe({
              alertesOuvertes: ouvertes.filter((a) => a.patientId === p.id).length,
              etapesManquees,
              risque: risques.get(p.id)?.global ?? { niveau: "normal", motifs: [] },
              ordonnancesARetirer: lesOrdonnances.filter((o) => o.patientId === p.id && !delivrees.has(o.id)).map((o) => o.code),
              etapesProches,
              rappelsSansReponse: injoignables.has(p.id),
            }),
          };
        })
        .sort((a, b) => (a.raisons[0]?.urgence ?? 3) - (b.raisons[0]?.urgence ?? 3));
      return { id: foyer.id, nom: foyer.nom, village: foyer.village, urgence: urgenceDuFoyer(membres), personnes: membres };
    }),
  );
  return tournee;
}
