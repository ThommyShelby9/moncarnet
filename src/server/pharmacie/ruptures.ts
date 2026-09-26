import { and, desc, eq, gte, isNotNull, isNull, or } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { Db } from "../db/client";
import { etablissements, ruptures } from "../db/schema";
import { echec, reussite, type Resultat } from "../resultat";

export const MEDICAMENT_MAX = 80;

interface ComptePharmacie {
  id: string;
  etablissementId: string | null;
}

export interface Rupture {
  id: string;
  medicament: string;
  pharmacie: string;
  signaleeLe: Date;
  finieLe: Date | null;
}

const nettoyer = (texte: string) => texte.trim().replace(/\s+/g, " ");
const cle = (texte: string) => nettoyer(texte).toLocaleLowerCase("fr");

/** « Ce médicament manque » : visible tout de suite par les soignants qui prescrivent. Une seule rupture en cours par médicament. */
export async function signalerRupture(
  db: Db,
  e: { compte: ComptePharmacie; medicament: string; maintenant?: Date },
): Promise<Resultat<{ ruptureId: string }, "invalide" | "deja_signalee">> {
  const medicament = nettoyer(e.medicament);
  if (!e.compte.etablissementId || medicament.length < 2 || medicament.length > MEDICAMENT_MAX) return echec("invalide");
  const enCours = await db
    .select({ medicament: ruptures.medicament })
    .from(ruptures)
    .where(and(eq(ruptures.pharmacieId, e.compte.etablissementId), isNull(ruptures.finieLe)));
  if (enCours.some((r) => cle(r.medicament) === cle(medicament))) return echec("deja_signalee");
  const [cree] = await db
    .insert(ruptures)
    .values({ pharmacieId: e.compte.etablissementId, medicament, auteurId: e.compte.id, signaleeLe: e.maintenant ?? new Date() })
    .returning({ id: ruptures.id });
  return reussite({ ruptureId: cree!.id });
}

/** « De nouveau disponible » : seulement pour une rupture en cours de sa propre pharmacie. */
export async function finirRupture(
  db: Db,
  e: { compte: ComptePharmacie; ruptureId: string; maintenant?: Date },
): Promise<Resultat<null, "introuvable">> {
  if (!e.compte.etablissementId || !estUuid(e.ruptureId)) return echec("introuvable");
  const finies = await db
    .update(ruptures)
    .set({ finieLe: e.maintenant ?? new Date() })
    .where(and(eq(ruptures.id, e.ruptureId), eq(ruptures.pharmacieId, e.compte.etablissementId), isNull(ruptures.finieLe)))
    .returning({ id: ruptures.id });
  return finies.length ? reussite(null) : echec("introuvable");
}

const colonnes = { id: ruptures.id, medicament: ruptures.medicament, pharmacie: etablissements.nom, signaleeLe: ruptures.signaleeLe, finieLe: ruptures.finieLe };

/** Toutes les ruptures en cours, toutes pharmacies : ce que le soignant voit avant de prescrire. */
export async function rupturesEnCours(db: Db): Promise<Rupture[]> {
  return db
    .select(colonnes)
    .from(ruptures)
    .innerJoin(etablissements, eq(ruptures.pharmacieId, etablissements.id))
    .where(isNull(ruptures.finieLe))
    .orderBy(desc(ruptures.signaleeLe));
}

/** Les ruptures d'une pharmacie : celles en cours, et celles finies depuis une date. */
export async function rupturesDe(db: Db, pharmacieId: string, depuis: Date): Promise<{ enCours: Rupture[]; finies: Rupture[] }> {
  const lignes = await db
    .select(colonnes)
    .from(ruptures)
    .innerJoin(etablissements, eq(ruptures.pharmacieId, etablissements.id))
    .where(and(eq(ruptures.pharmacieId, pharmacieId), or(isNull(ruptures.finieLe), and(isNotNull(ruptures.finieLe), gte(ruptures.finieLe, depuis)))))
    .orderBy(desc(ruptures.signaleeLe));
  return {
    enCours: lignes.filter((r) => !r.finieLe),
    finies: lignes.filter((r) => r.finieLe).sort((a, b) => b.finieLe!.getTime() - a.finieLe!.getTime()),
  };
}
