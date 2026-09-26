import type { Metadata } from "next";
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { CODES_INDICATEURS, INDICATEURS, lireIndicateur, type CodeIndicateur } from "@/domain/pilotage";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";
import { Icone } from "@/ui/Icone";
import { CarteIndicateur } from "./CarteIndicateur";
import { ClassementZones } from "./ClassementZones";
import { Confidentialite, EnCeMoment, Onglets, TAUX } from "./communs";
import { CourbeIndicateur } from "./CourbeIndicateur";
import { TableauCommunes } from "./TableauCommunes";

export const metadata: Metadata = { title: "Pilotage" };

const choisir = (v: string | string[] | undefined): CodeIndicateur => (TAUX.find((c) => c === v) ?? "cpn4") as CodeIndicateur;

function Exporter() {
  return (
    <a href="/api/pilotage/export" className="flex items-center gap-2 rounded-bouton bg-white px-4 py-2.5 text-sm font-bold text-marque">
      <Icone nom="ph-download-simple" className="size-5" />
      Exporter (CSV, format DHIS2)
    </a>
  );
}

export default async function Pilotage({ searchParams }: PageProps<"/pilotage">) {
  const compte = await exigerRole("pilotage");
  const indicateur = choisir((await searchParams).indicateur);
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);

  if (compte.communeId) {
    const vue = await vueDeZone(db(), compte.communeId, aujourdhui, maintenant);
    if (!vue) return <p className="rounded-carte bg-white p-5">Ce compte n&apos;est rattaché à aucune zone sanitaire.</p>;
    const precedent = vue.tendance.at(-2)?.valeurs;
    return (
      <>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gris">Zone sanitaire · {vue.departement}</p>
            <h1 className="text-3xl font-bold">{vue.zone}</h1>
            <p className="text-gris">Calculé en direct depuis les carnets de {vue.communes.map((c) => c.nom).join(" et ")}.</p>
          </div>
          <Exporter />
        </header>
        <Confidentialite />
        <EnCeMoment alertes={vue.alertes} />
        <section aria-labelledby="titre-indicateurs" className="flex flex-col gap-3">
          <h2 id="titre-indicateurs" className="text-lg font-bold">
            Ce mois-ci
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CODES_INDICATEURS.map((c) => (
              <CarteIndicateur key={c} code={c} comptage={vue.total[c]} precedent={precedent?.[c]} />
            ))}
          </div>
        </section>
        <section aria-labelledby="titre-tendance" className="flex flex-col gap-3">
          <h2 id="titre-tendance" className="text-lg font-bold">
            Sur 6 mois : {INDICATEURS[indicateur].libelle.toLowerCase()}
          </h2>
          <Onglets actif={indicateur} base="/pilotage?indicateur=" />
          <CourbeIndicateur code={indicateur} points={vue.tendance.map((t) => ({ mois: t.mois, comptage: t.valeurs[indicateur] }))} />
        </section>
        <section aria-labelledby="titre-communes" className="flex flex-col gap-3">
          <h2 id="titre-communes" className="text-lg font-bold">
            Commune par commune
          </h2>
          <TableauCommunes lignes={[...vue.communes, { nom: "Toute la zone", valeurs: vue.total, total: true }]} />
        </section>
      </>
    );
  }

  const vue = await vueNationale(db(), aujourdhui, maintenant);
  const precedent = vue.tendance.at(-2)?.valeurs;
  const aAppuyer = vue.zones
    .map((z) => ({ zone: z.zone, faibles: TAUX.filter((c) => lireIndicateur(c, z.valeurs[c]).niveau === "faible").map((c) => INDICATEURS[c].court) }))
    .filter((z) => z.faibles.length > 0)
    .sort((a, b) => b.faibles.length - a.faibles.length);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gris">Ministère de la Santé</p>
          <h1 className="text-3xl font-bold">Vue nationale</h1>
          <p className="text-gris">
            {vue.zones.length} zones sanitaires. La zone Zogbodomey-Bohicon-Zakpota est calculée en direct ; les autres sont des données fictives de démonstration.
          </p>
        </div>
        <Exporter />
      </header>
      <Confidentialite />
      <section aria-labelledby="titre-national" className="flex flex-col gap-3">
        <h2 id="titre-national" className="text-lg font-bold">
          Le pays ce mois-ci
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TAUX.map((c) => (
            <CarteIndicateur key={c} code={c} comptage={vue.national[c]} precedent={precedent?.[c]} />
          ))}
        </div>
      </section>
      <section aria-labelledby="titre-zones" className="flex flex-col gap-3">
        <h2 id="titre-zones" className="text-lg font-bold">
          Les zones : {INDICATEURS[indicateur].libelle.toLowerCase()}
        </h2>
        <Onglets actif={indicateur} base="/pilotage?indicateur=" />
        <div className="grid gap-4 xl:grid-cols-[1fr_minmax(0,28rem)]">
          <ClassementZones code={indicateur} zones={vue.zones} lien={(z) => `/pilotage/zones/${encodeURIComponent(z)}`} />
          <div className="flex flex-col gap-3">
            <h3 className="font-bold">Tendance nationale sur 6 mois</h3>
            <CourbeIndicateur code={indicateur} points={vue.tendance.map((t) => ({ mois: t.mois, comptage: t.valeurs[indicateur] }))} />
            {aAppuyer.length > 0 && (
              <div className="rounded-carte bg-white p-4">
                <h3 className="font-bold text-urgence">Zones à appuyer</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm">
                  {aAppuyer.slice(0, 5).map((z) => (
                    <li key={z.zone}>
                      <Link href={`/pilotage/zones/${encodeURIComponent(z.zone)}`} className="font-bold underline decoration-lavande-4 underline-offset-2">
                        {z.zone}
                      </Link>{" "}
                      : {z.faibles.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
