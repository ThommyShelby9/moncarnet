import { compteCourant } from "@/server/auth/cookies";
import { enregistrerAudio, MAX_AUDIO_OCTETS, supprimerAudio } from "@/server/contenus";
import { db } from "@/server/db/client";
import type { Langue } from "@/domain/langues";

export const dynamic = "force-dynamic";

const STATUT = { interdit: 403, introuvable: 404, invalide: 400, trop_lourd: 413 } as const;

/** L'administration envoie la version parlée d'un contenu (enregistrée au micro ou choisie en fichier). */
export async function POST(requete: Request, ctx: RouteContext<"/api/admin/contenus/[code]/[langue]">) {
  const compte = await compteCourant();
  if (!compte) return new Response(null, { status: 401 });
  const taille = Number(requete.headers.get("content-length") ?? 0);
  if (taille > MAX_AUDIO_OCTETS) return Response.json({ erreur: "trop_lourd" }, { status: 413 });
  const { code, langue } = await ctx.params;
  const octets = new Uint8Array(await requete.arrayBuffer());
  const resultat = await enregistrerAudio(db(), { compte, code, langue: langue as Langue, type: requete.headers.get("content-type") ?? "", octets });
  return resultat.ok ? Response.json({ ok: true }) : Response.json({ erreur: resultat.erreur }, { status: STATUT[resultat.erreur] });
}

export async function DELETE(_requete: Request, ctx: RouteContext<"/api/admin/contenus/[code]/[langue]">) {
  const compte = await compteCourant();
  if (!compte) return new Response(null, { status: 401 });
  const { code, langue } = await ctx.params;
  const resultat = await supprimerAudio(db(), { compte, code, langue: langue as Langue });
  return resultat.ok ? Response.json({ ok: true }) : Response.json({ erreur: resultat.erreur }, { status: STATUT[resultat.erreur] });
}
