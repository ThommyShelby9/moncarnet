import type { Metadata } from "next";
import { aujourdhuiAuBenin, depuisDateISO } from "@/domain/dates";
import { INDICATEURS } from "@/domain/pilotage";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";
import { alertesParSemaine, centresDeLaZone, type SemaineAlertes } from "@/server/requetes/pilotage-etat";
import { Actualisation } from "@/ui/Actualisation";
import { CarteIndicateur } from "../CarteIndicateur";
import { ClassementZones } from "../ClassementZones";
import { Confidentialite, EnCeMoment, lienZone } from "../communs";
import { CourbeIndicateur } from "../CourbeIndicateur";

export const metadata: Metadata = { title: "Alertes" };

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const jourCourt = (d: string) => {
  const date = depuisDateISO(d);
  return `${date.getUTCDate()} ${MOIS[date.getUTCMonth()]}`;
};

/** Les signes de danger et le délai de 15 minutes : en direct pour la zone, zone par zone pour le ministère (spec §4.6, §14). */
export default async function AlertesEtat() {
  const compte = await exigerRole("pilotage");
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);

  if (compte.communeId) {
    const vue = await vueDeZone(db(), compte.communeId, aujourdhui, maintenant);
    if (!vue) return <p className="rounded-carte bg-white p-5">Ce compte n&apos;est rattaché à aucune zone sanitaire.</p>;
    const [semaines, { centres }] = await Promise.all([alertesParSemaine(db(), vue.zone, aujourdhui, 8), centresDeLaZone(db(), vue.zone, aujourdhui, maintenant)]);
    return (
      <>
        <Actualisation />
        <header>
          <p className="text-sm font-bold text-gris">Zone sanitaire · {vue.zone}</p>
          <h1 className="text-3xl font-bold">Alertes</h1>
          <p className="mt-1 text-gris">Une alerte non prise en charge en 15 minutes remonte ici, en direct.</p>
        </header>
        <EnCeMoment alertes={vue.alertes} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CarteIndicateur code="alertes_15min" comptage={vue.total.alertes_15min} precedent={vue.tendance.at(-2)?.valeurs.alertes_15min} />
          <CarteIndicateur code="alertes_delai" comptage={vue.total.alertes_delai} precedent={vue.tendance.at(-2)?.valeurs.alertes_delai} />
        </div>
        <Semaines semaines={semaines} />
        <section aria-labelledby="titre-par-centre" className="flex flex-col gap-3">
          <h2 id="titre-par-centre" className="text-lg font-bold">
            Centre par centre, sur 30 jours
          </h2>
          <div className="overflow-x-auto rounded-carte bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gris">
                  <th className="p-3 font-bold">Centre</th>
                  <th className="p-3 font-bold">Alertes</th>
                  <th className="p-3 font-bold">Délai moyen</th>
                  <th className="p-3 font-bold">En 15 minutes</th>
                </tr>
              </thead>
              <tbody>
                {centres.map((c) => (
                  <tr key={c.id} className="border-t border-lavande-2">
                    <th scope="row" className="p-3 text-left font-bold">
                      {c.nom}
                    </th>
                    <td className="p-3">{c.alertes.total}</td>
                    <td className={`p-3 font-bold ${c.alertes.delaiMoyen !== null && c.alertes.delaiMoyen > 15 ? "text-urgence" : "text-marque"}`}>
                      {c.alertes.delaiMoyen === null ? "–" : `${c.alertes.delaiMoyen} min`}
                    </td>
                    <td className="p-3">{c.alertes.partSous15 === null ? "–" : `${c.alertes.partSous15} %`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  const vue = await vueNationale(db(), aujourdhui, maintenant);
  const lien = (z: string) => lienZone(z, "alertes_15min");
  return (
    <>
      <header>
        <p className="text-sm font-bold text-gris">Ministère de la Santé</p>
        <h1 className="text-3xl font-bold">Alertes</h1>
        <p className="mt-1 text-gris">Les signes de danger pris en charge à temps, zone par zone, sur les 30 derniers jours.</p>
      </header>
      <Confidentialite />
      <div className="grid gap-3 sm:grid-cols-2">
        <CarteIndicateur code="alertes_15min" comptage={vue.national.alertes_15min} precedent={vue.tendance.at(-2)?.valeurs.alertes_15min} />
        <CarteIndicateur code="alertes_delai" comptage={vue.national.alertes_delai} precedent={vue.tendance.at(-2)?.valeurs.alertes_delai} />
      </div>
      <section aria-labelledby="titre-tendance" className="flex flex-col gap-3">
        <h2 id="titre-tendance" className="text-lg font-bold">
          Tendance nationale : {INDICATEURS.alertes_15min.libelle.toLowerCase()}
        </h2>
        <CourbeIndicateur code="alertes_15min" points={vue.tendance.map((t) => ({ mois: t.mois, comptage: t.valeurs.alertes_15min }))} />
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <section aria-labelledby="titre-15" className="flex flex-col gap-3">
          <h2 id="titre-15" className="text-lg font-bold">
            Prises en charge en 15 minutes
          </h2>
          <ClassementZones code="alertes_15min" zones={vue.zones} lien={lien} />
        </section>
        <section aria-labelledby="titre-delai" className="flex flex-col gap-3">
          <h2 id="titre-delai" className="text-lg font-bold">
            Délai moyen
          </h2>
          <ClassementZones code="alertes_delai" zones={vue.zones} lien={lien} />
        </section>
      </div>
    </>
  );
}

/** Huit semaines d'alertes : en indigo celles prises en 15 minutes, en soleil les plus lentes, en rouge celles jamais prises. */
function Semaines({ semaines }: { semaines: SemaineAlertes[] }) {
  const max = Math.max(1, ...semaines.map((s) => s.total));
  return (
    <section aria-labelledby="titre-semaines" className="flex flex-col gap-3 rounded-carte bg-white p-5">
      <h2 id="titre-semaines" className="text-lg font-bold">
        Semaine par semaine
      </h2>
      <ol className="grid h-48 grid-cols-8 items-end gap-2">
        {semaines.map((s) => {
          const lentes = s.prises - s.sous15;
          const nonPrises = s.total - s.prises;
          return (
            <li key={s.debut} className="flex h-full flex-col items-center justify-end gap-1">
              <span className="text-xs font-bold tabular-nums">{s.total}</span>
              <span
                className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-lg"
                style={{ height: `${(s.total / max) * 100}%` }}
                aria-label={`Semaine du ${jourCourt(s.debut)} : ${s.total} alerte${s.total > 1 ? "s" : ""}, dont ${s.sous15} prise${s.sous15 > 1 ? "s" : ""} en 15 minutes`}
                role="img"
              >
                <span className="bg-marque" style={{ flexGrow: s.sous15 }} />
                <span className="bg-soleil" style={{ flexGrow: lentes }} />
                <span className="bg-urgence" style={{ flexGrow: nonPrises }} />
              </span>
              <span className="text-[11px] whitespace-nowrap text-gris">{jourCourt(s.debut)}</span>
            </li>
          );
        })}
      </ol>
      <p className="flex flex-wrap gap-4 text-xs text-gris">
        <span className="flex items-center gap-1.5">
          <i className="size-3 rounded bg-marque" /> Prises en 15 minutes
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-3 rounded bg-soleil" /> Prises plus tard
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-3 rounded bg-urgence" /> Pas encore prises
        </span>
      </p>
    </section>
  );
}
