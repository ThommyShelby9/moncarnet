import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { enregistrerNote, MAX_NOTE_OCTETS } from "@/server/relais/notes";

export const dynamic = "force-dynamic";

const STATUTS = { introuvable: 404, interdit: 403, invalide: 422 } as const;

/** Note vocale d'une visite déjà reçue : le corps est le son, tel qu'enregistré sur le téléphone. */
export async function POST(requete: Request) {
  const compte = await compteCourant();
  if (compte?.role !== "relais") return Response.json({ erreur: "non_connecte" }, { status: 401 });
  if (Number(requete.headers.get("content-length") ?? 0) > MAX_NOTE_OCTETS) return Response.json({ erreur: "invalide" }, { status: 413 });
  const octets = new Uint8Array(await requete.arrayBuffer());
  const resultat = await enregistrerNote(db(), {
    relaisId: compte.id,
    evenementId: new URL(requete.url).searchParams.get("id") ?? "",
    type: requete.headers.get("content-type") ?? "",
    octets,
  });
  if (resultat.ok) return Response.json({ statut: resultat.donnees });
  return Response.json({ erreur: resultat.erreur }, { status: STATUTS[resultat.erreur] });
}
