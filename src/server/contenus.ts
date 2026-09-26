import { and, asc, eq } from "drizzle-orm";
import { TEXTE_MAX } from "@/domain/contenus";
import { estLangue, LANGUES, type Langue } from "@/domain/langues";
import type { Db } from "./db/client";
import { contenus, contenusTraductions, type RoleCompte } from "./db/schema";
import { echec, reussite, type Resultat } from "./resultat";

/** Une minute de voix en Opus pèse environ 100 Ko : 1 Mo laisse de la marge, sans alourdir les téléphones. */
export const MAX_AUDIO_OCTETS = 1_000_000;
const TYPES_AUDIO = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/aac"];

interface CompteAdmin {
  id: string;
  role: RoleCompte;
}

export interface ContenuListe {
  id: string;
  code: string;
  categorie: string;
  titre: string;
  pictogramme: string;
  traductions: { langue: Langue; texte: string; audio: boolean; audioLe: Date | null }[];
}

/** Tous les contenus, par catégorie, avec leurs langues : ce qui est écrit, ce qui est enregistré. */
export async function listerContenus(db: Db): Promise<ContenuListe[]> {
  const lignes = await db
    .select({
      id: contenus.id,
      code: contenus.code,
      categorie: contenus.categorie,
      titre: contenus.titre,
      pictogramme: contenus.pictogramme,
      langue: contenusTraductions.langue,
      texte: contenusTraductions.texte,
      audioType: contenusTraductions.audioType,
      audioLe: contenusTraductions.audioLe,
    })
    .from(contenus)
    .leftJoin(contenusTraductions, eq(contenusTraductions.contenuId, contenus.id))
    .orderBy(asc(contenus.categorie), asc(contenus.code));
  const parCode = new Map<string, ContenuListe>();
  for (const l of lignes) {
    const c = parCode.get(l.code) ?? { id: l.id, code: l.code, categorie: l.categorie, titre: l.titre ?? l.code, pictogramme: l.pictogramme, traductions: [] };
    if (l.langue) c.traductions.push({ langue: l.langue, texte: l.texte ?? "", audio: Boolean(l.audioType), audioLe: l.audioLe });
    parCode.set(l.code, c);
  }
  for (const c of parCode.values()) c.traductions.sort((a, b) => LANGUES.indexOf(a.langue) - LANGUES.indexOf(b.langue));
  return [...parCode.values()];
}

async function idDuContenu(db: Db, code: string): Promise<string | null> {
  const [c] = await db.select({ id: contenus.id }).from(contenus).where(eq(contenus.code, code));
  return c?.id ?? null;
}

/** Texte d'un contenu dans une langue. Le français est obligatoire ; ailleurs l'écrit est facultatif (le fon se parle plus qu'il ne s'écrit). */
export async function modifierTexte(
  db: Db,
  e: { compte: CompteAdmin; code: string; langue: Langue; texte: string },
): Promise<Resultat<null, "interdit" | "introuvable" | "invalide">> {
  if (e.compte.role !== "admin") return echec("interdit");
  const texte = e.texte.trim();
  if (!estLangue(e.langue) || texte.length > TEXTE_MAX || (e.langue === "fr" && texte.length < 3)) return echec("invalide");
  const contenuId = await idDuContenu(db, e.code);
  if (!contenuId) return echec("introuvable");
  await db
    .insert(contenusTraductions)
    .values({ contenuId, langue: e.langue, texte })
    .onConflictDoUpdate({ target: [contenusTraductions.contenuId, contenusTraductions.langue], set: { texte } });
  return reussite(null);
}

/** La version parlée d'un contenu dans une langue, enregistrée au micro ou envoyée en fichier. */
export async function enregistrerAudio(
  db: Db,
  e: { compte: CompteAdmin; code: string; langue: Langue; type: string; octets: Uint8Array; maintenant?: Date },
): Promise<Resultat<null, "interdit" | "introuvable" | "invalide" | "trop_lourd">> {
  if (e.compte.role !== "admin") return echec("interdit");
  const type = e.type.split(";")[0]!.trim().toLowerCase();
  if (!estLangue(e.langue) || !TYPES_AUDIO.includes(type) || e.octets.length === 0) return echec("invalide");
  if (e.octets.length > MAX_AUDIO_OCTETS) return echec("trop_lourd");
  const contenuId = await idDuContenu(db, e.code);
  if (!contenuId) return echec("introuvable");
  const audio = { audio: e.octets, audioType: type, audioLe: e.maintenant ?? new Date() };
  await db
    .insert(contenusTraductions)
    .values({ contenuId, langue: e.langue, texte: "", ...audio })
    .onConflictDoUpdate({ target: [contenusTraductions.contenuId, contenusTraductions.langue], set: audio });
  return reussite(null);
}

export async function supprimerAudio(db: Db, e: { compte: CompteAdmin; code: string; langue: Langue }): Promise<Resultat<null, "interdit" | "introuvable">> {
  if (e.compte.role !== "admin") return echec("interdit");
  const contenuId = await idDuContenu(db, e.code);
  if (!contenuId || !estLangue(e.langue)) return echec("introuvable");
  await db
    .update(contenusTraductions)
    .set({ audio: null, audioType: null, audioLe: null })
    .where(and(eq(contenusTraductions.contenuId, contenuId), eq(contenusTraductions.langue, e.langue)));
  return reussite(null);
}

/** Les octets d'un enregistrement, pour la route qui le sert. */
export async function audioDuContenu(db: Db, code: string, langue: string): Promise<{ type: string; octets: Uint8Array } | null> {
  if (!estLangue(langue)) return null;
  const [l] = await db
    .select({ type: contenusTraductions.audioType, octets: contenusTraductions.audio })
    .from(contenusTraductions)
    .innerJoin(contenus, eq(contenus.id, contenusTraductions.contenuId))
    .where(and(eq(contenus.code, code), eq(contenusTraductions.langue, langue)));
  return l?.type && l.octets ? { type: l.type, octets: l.octets } : null;
}

export interface ContenuPourPatient {
  /** Le texte dans la langue demandée s'il est écrit, sinon le français. */
  texte: string;
  /** Adresse de l'enregistrement dans cette langue, sinon en français, sinon rien (la voix du téléphone lit le texte). */
  audio: string | null;
  langueAudio: Langue | null;
}

/** Ce qu'on montre et fait entendre à une famille, dans sa langue. */
export async function contenuPour(db: Db, code: string, langue: Langue): Promise<ContenuPourPatient | null> {
  const lignes = await db
    .select({ langue: contenusTraductions.langue, texte: contenusTraductions.texte, audioLe: contenusTraductions.audioLe, audioType: contenusTraductions.audioType })
    .from(contenusTraductions)
    .innerJoin(contenus, eq(contenus.id, contenusTraductions.contenuId))
    .where(eq(contenus.code, code));
  const dans = lignes.find((l) => l.langue === langue);
  const francais = lignes.find((l) => l.langue === "fr");
  if (!dans && !francais) return null;
  const avecAudio = [dans, francais].find((l) => l?.audioType && l.audioLe);
  return {
    texte: dans?.texte || francais?.texte || "",
    audio: avecAudio ? `/api/contenus/${code}/${avecAudio.langue}?v=${avecAudio.audioLe!.getTime()}` : null,
    langueAudio: avecAudio?.langue ?? null,
  };
}
