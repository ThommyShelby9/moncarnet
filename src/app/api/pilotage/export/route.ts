import { aujourdhuiAuBenin } from "@/domain/dates";
import { lignesDe, versCsv } from "@/domain/pilotage";
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";

export const dynamic = "force-dynamic";

/** Export des indicateurs du mois (CSV proche de DHIS2) : jamais de nom, les chiffres masqués restent masqués. */
export async function GET() {
  const compte = await compteCourant();
  if (compte?.role !== "pilotage") return new Response("Connexion requise", { status: 401 });
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);
  const periode = aujourdhui.slice(0, 7).replace("-", "");
  let csv: string;
  let nom: string;
  if (compte.communeId) {
    const vue = await vueDeZone(db(), compte.communeId, aujourdhui, maintenant);
    if (!vue) return new Response("Aucune zone sanitaire", { status: 404 });
    csv = versCsv([...vue.communes.flatMap((c) => lignesDe(c.nom, c.valeurs, periode)), ...lignesDe(vue.zone, vue.total, periode)]);
    nom = "zone";
  } else {
    const vue = await vueNationale(db(), aujourdhui, maintenant);
    csv = versCsv(vue.zones.flatMap((z) => lignesDe(z.zone, z.valeurs, periode)));
    nom = "national";
  }
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="indicateurs-${nom}-${periode}.csv"`, "Cache-Control": "no-store" },
  });
}
