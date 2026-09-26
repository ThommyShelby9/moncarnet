import type { Metadata } from "next";
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { CODES_INDICATEURS, INDICATEURS, lireIndicateur, type CodeIndicateur } from "@/domain/pilotage";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";
import { lieuxDeLaZone } from "@/server/requetes/pilotage-etat";
import { CarteIndicateur, STYLE_NIVEAU } from "../CarteIndicateur";
import { CarteNationale, CarteZone } from "../Cartes";
import { ClassementZones } from "../ClassementZones";
import { Confidentialite, lienZone, lireCode } from "../communs";
import { CourbeIndicateur } from "../CourbeIndicateur";

export const metadata: Metadata = { title: "Indicateurs" };

const CIBLE: Record<string, string> = { pourcent: "au moins", minutes: "au plus" };

/** Un indicateur à la fois : sa définition, son objectif, sa tendance, puis le détail par commune (zone) ou par zone (ministère). */
export default async function Indicateurs({ searchParams }: PageProps<"/pilotage/indicateurs">) {
  const compte = await exigerRole("pilotage");
  const code = lireCode((await searchParams).code, CODES_INDICATEURS);
  const d = INDICATEURS[code];
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);
  const zone = compte.communeId ? await vueDeZone(db(), compte.communeId, aujourdhui, maintenant) : null;
  const nationale = compte.communeId ? null : await vueNationale(db(), aujourdhui, maintenant);
  const tendance = zone?.tendance ?? nationale!.tendance;
  const lieux = zone ? await lieuxDeLaZone(db(), zone.zone) : [];
  const actuel = zone?.total ?? nationale!.national;

  return (
    <>
      <header>
        <p className="text-sm font-bold text-gris">{zone ? `Zone sanitaire ${zone.zone}` : "Ministère de la Santé"}</p>
        <h1 className="text-3xl font-bold">Indicateurs</h1>
      </header>
      <Confidentialite />
      <div className="grid items-start gap-5 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Indicateurs" className="flex flex-col gap-1 rounded-carte bg-white p-2">
          {CODES_INDICATEURS.map((c) => {
            const lecture = lireIndicateur(c, actuel[c]);
            return (
              <Link
                key={c}
                href={`/pilotage/indicateurs?code=${c}`}
                aria-current={c === code ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm font-bold ${c === code ? "bg-marque text-white" : "text-nuit hover:bg-lavande"}`}
              >
                <span>{INDICATEURS[c].court}</span>
                <span className={c === code ? "text-white" : lecture.niveau ? STYLE_NIVEAU[lecture.niveau].texte : "text-gris"}>{lecture.texte}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="titre-indicateur" className="flex flex-col gap-3">
            <h2 id="titre-indicateur" className="text-2xl font-bold">
              {d.libelle}
            </h2>
            <p className="text-gris">
              {d.aide}.
              {d.cible !== undefined && (
                <>
                  {" "}
                  Objectif : {CIBLE[d.unite]} <b className="text-nuit">{d.unite === "minutes" ? `${d.cible} min` : `${d.cible} %`}</b>.
                </>
              )}
            </p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,18rem)_1fr]">
              <CarteIndicateur code={code} comptage={actuel[code]} precedent={tendance.at(-2)?.valeurs[code]} />
              <CourbeIndicateur code={code} points={tendance.map((t) => ({ mois: t.mois, comptage: t.valeurs[code] }))} />
            </div>
          </section>
          {zone && (
            <section aria-labelledby="titre-communes" className="flex flex-col gap-3">
              <h2 id="titre-communes" className="text-lg font-bold">
                Commune par commune
              </h2>
              <CarteZone zone={zone.zone} code={code} communes={zone.communes} lieux={lieux} titre={`Carte de la zone : ${d.libelle.toLowerCase()}, commune par commune`} />
              <div className="grid gap-3 sm:grid-cols-2">
                {zone.communes.map((c) => (
                  <div key={c.nom} className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-gris">{c.nom}</h3>
                    <CarteIndicateur code={code} comptage={c.valeurs[code]} />
                  </div>
                ))}
              </div>
            </section>
          )}
          {nationale && (
            <section aria-labelledby="titre-zones" className="flex flex-col gap-3">
              <h2 id="titre-zones" className="text-lg font-bold">
                Zone par zone
              </h2>
              <CarteNationale code={code} zones={nationale.zones} lien={(z) => lienZone(z, code)} titre={`Carte des zones sanitaires : ${d.libelle.toLowerCase()}`} />
              <ClassementZones code={code as CodeIndicateur} zones={nationale.zones} lien={(z) => lienZone(z, code)} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
