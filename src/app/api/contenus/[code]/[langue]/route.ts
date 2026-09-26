import { audioDuContenu } from "@/server/contenus";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

/**
 * Version parlée d'un conseil de santé. Rien de personnel : elle s'écoute sans compte, et reste en cache
 * (l'adresse change avec chaque nouvel enregistrement, ?v=…), pour être rejouée sans réseau.
 */
export async function GET(_requete: Request, ctx: RouteContext<"/api/contenus/[code]/[langue]">) {
  const { code, langue } = await ctx.params;
  const audio = await audioDuContenu(db(), code, langue);
  if (!audio) return new Response(null, { status: 404 });
  return new Response(audio.octets.slice(), {
    headers: { "Content-Type": audio.type, "Content-Length": String(audio.octets.byteLength), "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
