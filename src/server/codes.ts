import { eq } from "drizzle-orm";
import { genererCodeRetrait } from "@/domain/ordonnances";
import type { Db } from "./db/client";
import { patients } from "./db/schema";

/** Code écrit dans le carnet (même format que le code de retrait) : on en tire un autre s'il est déjà pris. */
export async function codeDuCarnetLibre(db: Pick<Db, "select">): Promise<string> {
  for (;;) {
    const code = genererCodeRetrait();
    const [pris] = await db.select({ id: patients.id }).from(patients).where(eq(patients.codeCourt, code)).limit(1);
    if (!pris) return code;
  }
}
