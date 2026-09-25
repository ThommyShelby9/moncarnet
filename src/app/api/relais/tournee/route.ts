import { aujourdhuiAuBenin } from "@/domain/dates";
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { tourneeDuRelais } from "@/server/requetes/tournee";

export const dynamic = "force-dynamic";

/** Tournée du jour, copiée sur le téléphone du relais pour être lue sans réseau. */
export async function GET() {
  const compte = await compteCourant();
  if (compte?.role !== "relais") return Response.json({ erreur: "non_connecte" }, { status: 401 });
  const maintenant = new Date();
  const tournee = await tourneeDuRelais(db(), compte.id, compte.nomAffiche, aujourdhuiAuBenin(maintenant), maintenant);
  return Response.json(tournee, { headers: { "Cache-Control": "no-store" } });
}
