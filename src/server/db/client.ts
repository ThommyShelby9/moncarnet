import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "@/config/env";
import * as schema from "./schema";

/** Type commun à Postgres (développement, production) et PGlite (tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Connexion {
  db: Db;
  migrer(): Promise<void>;
  fermer(): Promise<void>;
}

export const DOSSIER_MIGRATIONS = path.join(process.cwd(), "drizzle");

export function ouvrirConnexion(url: string): Connexion {
  const client = postgres(url, { max: 10 });
  const base = drizzle({ client, schema });
  return {
    db: base as unknown as Db,
    migrer: () => migrate(base, { migrationsFolder: DOSSIER_MIGRATIONS }),
    fermer: () => client.end(),
  };
}

const globale = globalThis as typeof globalThis & { __connexionSante?: Connexion };

/** Connexion unique au processus (réutilisée par le rechargement à chaud en développement). */
export function connexion(): Connexion {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL n'est pas définie (voir .env.example).");
  globale.__connexionSante ??= ouvrirConnexion(env.DATABASE_URL);
  return globale.__connexionSante;
}

export const db = (): Db => connexion().db;
