import { eq } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { CompteConnecte } from "../auth/sessions";
import type { Db } from "../db/client";
import { evenements, fichiers } from "../db/schema";
import { patientDuCentre } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

/** Une minute de voix compressée pèse environ 200 Ko : 2 Mo laissent une large marge. */
export const MAX_NOTE_OCTETS = 2_000_000;
const TYPE_AUDIO = /^audio\/(webm|ogg|mp4|mpeg|aac)(;.*)?$/;

/** Note vocale d'une visite : elle part après la visite, et une seule fois. */
export async function enregistrerNote(
  db: Db,
  e: { relaisId: string; evenementId: string; type: string; octets: Uint8Array },
): Promise<Resultat<"accepte" | "deja_recu", "introuvable" | "interdit" | "invalide">> {
  if (!estUuid(e.evenementId)) return echec("introuvable");
  if (!TYPE_AUDIO.test(e.type) || e.octets.byteLength === 0 || e.octets.byteLength > MAX_NOTE_OCTETS) return echec("invalide");
  const [visite] = await db.select({ auteurId: evenements.auteurId, type: evenements.type }).from(evenements).where(eq(evenements.id, e.evenementId));
  if (!visite || visite.type !== "visite_domicile") return echec("introuvable");
  if (visite.auteurId !== e.relaisId) return echec("interdit");
  const insere = await db
    .insert(fichiers)
    .values({ evenementId: e.evenementId, type: e.type, taille: e.octets.byteLength, donnees: e.octets })
    .onConflictDoNothing({ target: fichiers.evenementId })
    .returning({ id: fichiers.evenementId });
  return reussite(insere.length ? "accepte" : "deja_recu");
}

/** La note ne s'écoute que par le relais qui l'a dite ou par un soignant du centre de la personne (spec §12). */
export async function lireNote(
  db: Db,
  compte: Pick<CompteConnecte, "id" | "role" | "etablissementId">,
  evenementId: string,
): Promise<{ type: string; donnees: Uint8Array } | null> {
  if (!estUuid(evenementId)) return null;
  const [ligne] = await db
    .select({ type: fichiers.type, donnees: fichiers.donnees, auteurId: evenements.auteurId, patientId: evenements.patientId })
    .from(fichiers)
    .innerJoin(evenements, eq(fichiers.evenementId, evenements.id))
    .where(eq(fichiers.evenementId, evenementId));
  if (!ligne) return null;
  const autorise =
    (compte.role === "relais" && ligne.auteurId === compte.id) ||
    (compte.role === "soignant" && (await patientDuCentre(db, compte.etablissementId, ligne.patientId)));
  return autorise ? { type: ligne.type, donnees: ligne.donnees } : null;
}
