import { aujourdhuiAuBenin } from "@/domain/dates";
import { MAX_LOT } from "@/domain/synchronisation";
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { synchroniser } from "@/server/relais/synchronisation";

export const dynamic = "force-dynamic";

/** File d'envoi du relais : une réponse par saisie (reçue, déjà reçue, refusée avec sa raison). */
export async function POST(requete: Request) {
  const compte = await compteCourant();
  if (compte?.role !== "relais") return Response.json({ erreur: "non_connecte" }, { status: 401 });
  const corps: unknown = await requete.json().catch(() => null);
  const lot = (corps as { evenements?: unknown } | null)?.evenements;
  if (!Array.isArray(lot) || lot.length > MAX_LOT) return Response.json({ erreur: "lot_invalide" }, { status: 400 });
  const maintenant = new Date();
  const resultats = await synchroniser(db(), { relaisId: compte.id, lot, maintenant, aujourdhui: aujourdhuiAuBenin(maintenant) });
  return Response.json({ resultats });
}
