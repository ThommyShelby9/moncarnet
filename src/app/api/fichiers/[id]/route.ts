import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { lireNote } from "@/server/relais/notes";

export const dynamic = "force-dynamic";

/** Écoute d'une note vocale : par son relais, ou par un soignant du centre de la personne. */
export async function GET(_requete: Request, ctx: RouteContext<"/api/fichiers/[id]">) {
  const compte = await compteCourant();
  if (!compte) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const note = await lireNote(db(), compte, id);
  if (!note) return new Response(null, { status: 404 });
  return new Response(note.donnees.slice(), {
    headers: { "Content-Type": note.type, "Content-Length": String(note.donnees.byteLength), "Cache-Control": "private, max-age=3600" },
  });
}
