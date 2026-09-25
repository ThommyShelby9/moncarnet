import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { DOSSIER_MIGRATIONS, type Db } from "@/server/db/client";
import * as schema from "@/server/db/schema";

/** Base Postgres en mémoire (PGlite), migrée, propre à chaque test. */
export async function creerDbDeTest(): Promise<{ db: Db; fermer: () => Promise<void> }> {
  const client = new PGlite();
  const base = drizzle({ client, schema });
  await migrate(base, { migrationsFolder: DOSSIER_MIGRATIONS });
  return { db: base as unknown as Db, fermer: () => client.close() };
}
