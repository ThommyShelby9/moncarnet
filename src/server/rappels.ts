import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, type SQL } from "drizzle-orm";
import { ajouterJours, type DateISO } from "@/domain/dates";
import { estUuid } from "@/domain/identifiants";
import type { MotifRdv } from "@/domain/programmes";
import { canalSuivant, premierCanal, texteRappel, type CanalRappel } from "@/domain/rappels";
import type { Db } from "./db/client";
import { consentements, contacts, etablissements, patients, rappels, rendezVous } from "./db/schema";
import { lienAvecPatient } from "./droits";
import { echec, reussite, type Resultat } from "./resultat";

/** Sans réponse au bout de 2 heures, le rappel passe au canal suivant (spec §4.3). */
export const DELAI_RELANCE_MINUTES = 120;
const POUR_LE_RELAIS = "À prévenir de vive voix : les rappels par téléphone sont restés sans réponse.";

interface Cible {
  rendezVousId: string;
  patientId: string;
  prenom: string;
  datePrevue: DateISO;
  moment: "matin" | "apres_midi" | null;
  motif: MotifRdv;
  centre: string;
  canalPrefere: CanalRappel;
  /** Jamais d'appel vocal : un message écrit, puis le relais. */
  malentendant: boolean;
  telephone: string | null;
  proprietaire: "soi" | "proche" | "relais" | null;
  consentements: string[];
}

async function cibles(db: Db, condition: SQL | undefined): Promise<Cible[]> {
  const lignes = await db
    .select({
      rendezVousId: rendezVous.id,
      patientId: rendezVous.patientId,
      datePrevue: rendezVous.datePrevue,
      moment: rendezVous.moment,
      motif: rendezVous.motif,
      prenom: patients.prenom,
      canalPrefere: patients.canalPrefere,
      malentendant: patients.malentendant,
      centre: etablissements.nom,
    })
    .from(rendezVous)
    .innerJoin(patients, eq(rendezVous.patientId, patients.id))
    .innerJoin(etablissements, eq(rendezVous.etablissementId, etablissements.id))
    .where(condition);
  if (lignes.length === 0) return [];
  const ids = [...new Set(lignes.map((l) => l.patientId))];
  const [telephones, accords] = await Promise.all([
    db
      .select({ patientId: contacts.patientId, telephone: contacts.telephone, proprietaire: contacts.proprietaire })
      .from(contacts)
      .where(and(inArray(contacts.patientId, ids), eq(contacts.role, "principal"))),
    db
      .select({ patientId: consentements.patientId, canal: consentements.canal })
      .from(consentements)
      .where(and(inArray(consentements.patientId, ids), isNull(consentements.retireLe))),
  ]);
  return lignes.map((l) => {
    const tel = telephones.find((t) => t.patientId === l.patientId);
    return {
      ...l,
      telephone: tel?.telephone ?? null,
      proprietaire: tel?.proprietaire ?? null,
      consentements: accords.filter((a) => a.patientId === l.patientId).map((a) => a.canal),
    };
  });
}

/** Le message pour ce canal ; « pour Sèna » quand le téléphone n'est pas celui de la personne. */
function versCanal(c: Cible, canal: CanalRappel, maintenant: Date) {
  const relais = canal === "relais";
  return {
    patientId: c.patientId,
    rendezVousId: c.rendezVousId,
    canal,
    telephone: relais ? null : c.telephone,
    contenu: relais
      ? POUR_LE_RELAIS
      : texteRappel({ pour: c.proprietaire === "soi" ? null : c.prenom, vaccin: c.motif === "vaccin", date: c.datePrevue, moment: c.moment, centre: c.centre, canal }),
    envoyeLe: maintenant,
  };
}

/** À J-2, chaque place réservée reçoit un rappel sur le premier canal de la personne ; relancer l'envoi ne crée pas de doublon. */
export async function envoyerRappels(db: Db, e: { maintenant: Date; aujourdhui: DateISO }): Promise<{ envoyes: number }> {
  const liste = await cibles(db, and(eq(rendezVous.datePrevue, ajouterJours(e.aujourdhui, 2)), isNotNull(rendezVous.creneauId), isNull(rendezVous.annuleLe)));
  let envoyes = 0;
  for (const c of liste) {
    const canal = premierCanal({ canalPrefere: c.canalPrefere, telephone: c.telephone, consentements: c.consentements, malentendant: c.malentendant });
    const insere = await db.insert(rappels).values(versCanal(c, canal, e.maintenant)).onConflictDoNothing().returning({ id: rappels.id });
    envoyes += insere.length;
  }
  return { envoyes };
}

/** Sans réponse après le délai, le rappel passe au canal suivant ; au bout de la cascade, c'est le relais qui passe. */
export async function relancer(db: Db, e: { maintenant: Date; delaiMinutes?: number }): Promise<{ relances: number }> {
  const limite = new Date(e.maintenant.getTime() - (e.delaiMinutes ?? DELAI_RELANCE_MINUTES) * 60_000);
  const enAttente = await db
    .select()
    .from(rappels)
    .where(and(eq(rappels.statut, "envoye"), lte(rappels.envoyeLe, limite), ne(rappels.canal, "relais")));
  if (enAttente.length === 0) return { relances: 0 };
  const liste = await cibles(db, and(inArray(rendezVous.id, enAttente.map((r) => r.rendezVousId)), isNull(rendezVous.annuleLe)));
  let relances = 0;
  for (const r of enAttente) {
    const passe = await db
      .update(rappels)
      .set({ statut: "sans_reponse" })
      .where(and(eq(rappels.id, r.id), eq(rappels.statut, "envoye")))
      .returning({ id: rappels.id });
    const cible = liste.find((c) => c.rendezVousId === r.rendezVousId);
    const suivant = canalSuivant(r.canal, { malentendant: cible?.malentendant });
    if (!passe.length || !cible || !suivant) continue;
    // Sans téléphone, on ne peut ni écrire ni appeler : le relais directement.
    const canal: CanalRappel = suivant !== "relais" && !cible.telephone ? "relais" : suivant;
    const insere = await db.insert(rappels).values(versCanal(cible, canal, e.maintenant)).onConflictDoNothing().returning({ id: rappels.id });
    relances += insere.length;
  }
  return { relances };
}

/**
 * « Je viendrai » confirme ; « Je ne peux pas » libère la place. Une seule réponse par rendez-vous.
 * Avec un compte (espace patient), il faut gérer ce carnet ; le faux téléphone de la démo répond sans compte.
 */
export async function repondreRappel(
  db: Db,
  e: { rappelId: string; reponse: "viendra" | "empeche"; maintenant?: Date; compteId?: string },
): Promise<Resultat<{ reponse: "viendra" | "empeche"; patientId: string; rendezVousId: string }, "introuvable" | "interdit" | "deja_repondu">> {
  if (!estUuid(e.rappelId)) return echec("introuvable");
  const [rappel] = await db.select().from(rappels).where(eq(rappels.id, e.rappelId));
  if (!rappel) return echec("introuvable");
  if (e.compteId && !(await lienAvecPatient(db, e.compteId, rappel.patientId))) return echec("interdit");
  const maintenant = e.maintenant ?? new Date();
  const dejaRepondu = await db
    .select({ id: rappels.id })
    .from(rappels)
    .where(and(eq(rappels.rendezVousId, rappel.rendezVousId), isNotNull(rappels.reponse)))
    .limit(1);
  if (dejaRepondu.length) return echec("deja_repondu");
  await db.update(rappels).set({ statut: "repondu", reponse: e.reponse, reponduLe: maintenant }).where(eq(rappels.id, rappel.id));
  if (e.reponse === "empeche") {
    await db
      .update(rendezVous)
      .set({ annuleLe: maintenant })
      .where(and(eq(rendezVous.id, rappel.rendezVousId), isNull(rendezVous.annuleLe)));
  }
  return reussite({ reponse: e.reponse, patientId: rappel.patientId, rendezVousId: rappel.rendezVousId });
}

export interface RappelVu {
  id: string;
  canal: CanalRappel;
  contenu: string;
  envoyeLe: Date;
  statut: "envoye" | "repondu" | "sans_reponse";
  reponse: "viendra" | "empeche" | null;
}

/** L'historique des rappels (dossier du soignant), le plus récent d'abord. */
export async function rappelsDe(db: Db, patientId: string): Promise<RappelVu[]> {
  return db
    .select({ id: rappels.id, canal: rappels.canal, contenu: rappels.contenu, envoyeLe: rappels.envoyeLe, statut: rappels.statut, reponse: rappels.reponse })
    .from(rappels)
    .where(eq(rappels.patientId, patientId))
    .orderBy(desc(rappels.envoyeLe))
    .limit(12);
}

/** Ce qu'a reçu un numéro (faux téléphone de la démo), le plus récent d'abord ; « repondable » tant que personne n'a répondu. */
export async function messagesDuTelephone(db: Db, telephone: string): Promise<(RappelVu & { repondable: boolean })[]> {
  const lignes = await db
    .select({
      id: rappels.id,
      rendezVousId: rappels.rendezVousId,
      canal: rappels.canal,
      contenu: rappels.contenu,
      envoyeLe: rappels.envoyeLe,
      statut: rappels.statut,
      reponse: rappels.reponse,
      annuleLe: rendezVous.annuleLe,
    })
    .from(rappels)
    .innerJoin(rendezVous, eq(rappels.rendezVousId, rendezVous.id))
    .where(eq(rappels.telephone, telephone))
    .orderBy(desc(rappels.envoyeLe), desc(rappels.canal));
  const repondus = new Set(lignes.filter((l) => l.reponse).map((l) => l.rendezVousId));
  return lignes.map(({ rendezVousId, annuleLe, ...l }) => ({ ...l, repondable: l.statut === "envoye" && !repondus.has(rendezVousId) && !annuleLe }));
}

/** Pour l'accueil : le dernier rappel qui attend une réponse, parmi les carnets affichés. */
export async function rappelEnAttente(
  db: Db,
  patientIds: string[],
): Promise<{ rappelId: string; patientId: string; rendezVousId: string; canal: CanalRappel; datePrevue: DateISO; moment: "matin" | "apres_midi" | null; motif: MotifRdv } | null> {
  if (patientIds.length === 0) return null;
  const lignes = await db
    .select({
      rappelId: rappels.id,
      patientId: rappels.patientId,
      rendezVousId: rappels.rendezVousId,
      canal: rappels.canal,
      datePrevue: rendezVous.datePrevue,
      moment: rendezVous.moment,
      motif: rendezVous.motif,
    })
    .from(rappels)
    .innerJoin(rendezVous, eq(rappels.rendezVousId, rendezVous.id))
    .where(and(inArray(rappels.patientId, patientIds), eq(rappels.statut, "envoye"), ne(rappels.canal, "relais"), isNull(rendezVous.annuleLe)))
    .orderBy(desc(rappels.envoyeLe));
  for (const l of lignes) {
    const repondu = await db
      .select({ id: rappels.id })
      .from(rappels)
      .where(and(eq(rappels.rendezVousId, l.rendezVousId), isNotNull(rappels.reponse)))
      .limit(1);
    if (!repondu.length) return l;
  }
  return null;
}

/** Pour la tournée du relais : les personnes que la cascade n'a pas jointes (rendez-vous à venir ou récent). */
export async function sansReponseAuTelephone(db: Db, patientIds: string[], aujourdhui: DateISO): Promise<Set<string>> {
  if (patientIds.length === 0) return new Set();
  const lignes = await db
    .select({ patientId: rappels.patientId, rendezVousId: rappels.rendezVousId })
    .from(rappels)
    .innerJoin(rendezVous, eq(rappels.rendezVousId, rendezVous.id))
    .where(
      and(
        inArray(rappels.patientId, patientIds),
        eq(rappels.canal, "relais"),
        isNull(rappels.reponse),
        isNull(rendezVous.annuleLe),
        gte(rendezVous.datePrevue, ajouterJours(aujourdhui, -14)),
      ),
    );
  return new Set(lignes.map((l) => l.patientId));
}
