import type { NextRequest } from "next/server";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { activiteVersCsv, lignesDe, versCsv } from "@/domain/pilotage";
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";
import { centresDeLaZone, vueDUneZone } from "@/server/requetes/pilotage-etat";

export const dynamic = "force-dynamic";

const periodeDe = (jour: string) => jour.slice(0, 7).replace("-", "");

/**
 * Exports du pilotage (CSV proche de DHIS2) : jamais de nom, les chiffres masqués restent masqués.
 * ?quoi=mois (par défaut) : les indicateurs du mois ; historique : les 6 derniers mois ; centres : l'activité des centres et des relais (zone).
 */
export async function GET(requete: NextRequest) {
  const compte = await compteCourant();
  if (compte?.role !== "pilotage") return new Response("Connexion requise", { status: 401 });
  const quoi = requete.nextUrl.searchParams.get("quoi") ?? "mois";
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);
  const periode = periodeDe(aujourdhui);
  let csv: string;
  let nom: string;
  if (compte.communeId) {
    const vue = await vueDeZone(db(), compte.communeId, aujourdhui, maintenant);
    if (!vue) return new Response("Aucune zone sanitaire", { status: 404 });
    if (quoi === "historique") {
      csv = versCsv(vue.tendance.flatMap((t) => lignesDe(vue.zone, t.valeurs, periodeDe(t.mois))));
      nom = `historique-zone-${periode}`;
    } else if (quoi === "centres") {
      const { centres, relais } = await centresDeLaZone(db(), vue.zone, aujourdhui, maintenant);
      csv = activiteVersCsv(centres, relais, periode);
      nom = `centres-relais-${periode}`;
    } else {
      csv = versCsv([...vue.communes.flatMap((c) => lignesDe(c.nom, c.valeurs, periode)), ...lignesDe(vue.zone, vue.total, periode)]);
      nom = `indicateurs-zone-${periode}`;
    }
  } else {
    const vue = await vueNationale(db(), aujourdhui, maintenant);
    if (quoi === "historique") {
      const fiches = await Promise.all(vue.zones.map((z) => vueDUneZone(db(), z.zone, aujourdhui, maintenant)));
      csv = versCsv(fiches.flatMap((f) => (f ? f.tendance.flatMap((t) => lignesDe(f.zone, t.valeurs, periodeDe(t.mois))) : [])));
      nom = `historique-national-${periode}`;
    } else {
      csv = versCsv(vue.zones.flatMap((z) => lignesDe(z.zone, z.valeurs, periode)));
      nom = `indicateurs-national-${periode}`;
    }
  }
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nom}.csv"`, "Cache-Control": "no-store" },
  });
}
