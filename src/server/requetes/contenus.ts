import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { contenus, contenusTraductions, type Langue } from "../db/schema";

/** Texte d'un contenu géré dans l'admin, dans une langue (français par défaut). */
export async function texteContenu(db: Db, code: string, langue: Langue = "fr"): Promise<string | null> {
  const [ligne] = await db
    .select({ texte: contenusTraductions.texte })
    .from(contenus)
    .innerJoin(contenusTraductions, eq(contenusTraductions.contenuId, contenus.id))
    .where(and(eq(contenus.code, code), eq(contenusTraductions.langue, langue)));
  return ligne?.texte ?? null;
}
