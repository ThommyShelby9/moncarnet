import { sql } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/server/db/client";

// Jamais précalculée pendant la construction : la base n'y est pas joignable.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db().execute(sql`select 1`);
    return Response.json({ ok: true, application: env.NEXT_PUBLIC_APP_NAME });
  } catch (erreur) {
    console.error("Base de données injoignable :", erreur);
    return Response.json({ ok: false }, { status: 503 });
  }
}
