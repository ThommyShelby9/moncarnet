import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueNationale } from "@/server/requetes/pilotage";
import { Confidentialite, lienZone } from "../communs";
import { TableauCommunes } from "../TableauCommunes";

export const metadata: Metadata = { title: "Zones sanitaires" };

/** Toutes les zones sanitaires côte à côte, chacune ouvre sa fiche (ministère seulement). */
export default async function Zones() {
  const compte = await exigerRole("pilotage");
  if (compte.communeId) redirect("/pilotage");
  const maintenant = new Date();
  const vue = await vueNationale(db(), aujourdhuiAuBenin(maintenant), maintenant);
  const parDepartement = [...vue.zones].sort((a, b) => a.departement.localeCompare(b.departement, "fr") || a.zone.localeCompare(b.zone, "fr"));
  return (
    <>
      <header>
        <p className="text-sm font-bold text-gris">Ministère de la Santé</p>
        <h1 className="text-3xl font-bold">Zones sanitaires</h1>
        <p className="mt-1 text-gris">
          {vue.zones.length} zones, ce mois-ci. Ouvrez une zone pour voir sa tendance et, quand ses carnets sont ici, ses communes et ses alertes en direct.
        </p>
      </header>
      <Confidentialite />
      <TableauCommunes
        entete="Zone sanitaire"
        lien={(z) => lienZone(z)}
        lignes={[
          ...parDepartement.map((z) => ({ nom: z.zone, valeurs: z.valeurs, note: z.direct ? `${z.departement} · en direct` : z.departement })),
          { nom: "Tout le pays", valeurs: vue.national, total: true },
        ]}
      />
    </>
  );
}
