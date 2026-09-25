import { env } from "@/config/env";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { db } from "@/server/db/client";
import { autoriserReinitialisation } from "@/server/demo/autorisation";
import { semerDemo } from "@/server/demo/semer";

export async function POST(requete: Request) {
  if (!autoriserReinitialisation(requete.headers.get("authorization"), env)) {
    return Response.json({ ok: false }, { status: 403 });
  }
  const bilan = await semerDemo(db(), { aujourdhui: aujourdhuiAuBenin() });
  return Response.json({ ok: true, bilan });
}
