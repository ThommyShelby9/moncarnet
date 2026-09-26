import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueDeZone } from "@/server/requetes/pilotage";
import { centresDeLaZone, lieuxDeLaZone, type ActiviteCentre, type ActiviteRelais } from "@/server/requetes/pilotage-etat";
import { Icone } from "@/ui/Icone";
import { CarteZone } from "../Cartes";
import { Confidentialite } from "../communs";

export const metadata: Metadata = { title: "Centres et relais" };

/** L'activité de chaque centre et de chaque relais de la zone, sur 30 jours (spec §4.10) : des comptes, pas de noms de patients. */
export default async function CentresEtRelais() {
  const compte = await exigerRole("pilotage");
  if (!compte.communeId) redirect("/pilotage/zones");
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);
  const vue = await vueDeZone(db(), compte.communeId, aujourdhui, maintenant);
  if (!vue) redirect("/pilotage");
  const [{ centres, relais }, lieux] = await Promise.all([centresDeLaZone(db(), vue.zone, aujourdhui, maintenant), lieuxDeLaZone(db(), vue.zone)]);
  return (
    <>
      <header>
        <p className="text-sm font-bold text-gris">Zone sanitaire · {vue.zone}</p>
        <h1 className="text-3xl font-bold">Centres et relais</h1>
        <p className="mt-1 text-gris">L&apos;activité des 30 derniers jours, et les places des 7 prochains jours.</p>
      </header>
      <Confidentialite />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <CarteZone zone={vue.zone} lieux={lieux} titre={`Carte de la zone ${vue.zone} : ses communes et ses établissements`} />
        <div className="flex flex-col gap-5">
          <section aria-labelledby="titre-centres" className="flex flex-col gap-3">
            <h2 id="titre-centres" className="text-lg font-bold">
              Centres de santé
            </h2>
            {centres.length ? (
              centres.map((c) => <Centre key={c.id} centre={c} />)
            ) : (
              <p className="rounded-carte bg-white p-4 text-gris">Aucun centre de santé dans la zone.</p>
            )}
          </section>
          <section aria-labelledby="titre-relais" className="flex flex-col gap-3">
            <h2 id="titre-relais" className="text-lg font-bold">
              Relais communautaires
            </h2>
            {relais.length ? relais.map((r) => <Relais key={r.id} relais={r} />) : <p className="rounded-carte bg-white p-4 text-gris">Aucun relais dans la zone.</p>}
          </section>
        </div>
      </div>
    </>
  );
}

function Mesure({ valeur, libelle, alerte = false }: { valeur: string; libelle: string; alerte?: boolean }) {
  return (
    <div className="rounded-2xl bg-lavande px-3 py-2.5">
      <dt className="sr-only">{libelle}</dt>
      <dd className={`text-xl font-bold tabular-nums ${alerte ? "text-urgence" : ""}`}>{valeur}</dd>
      <dd aria-hidden="true" className="text-xs text-gris">
        {libelle}
      </dd>
    </div>
  );
}

function Barre({ part, libelle }: { part: number; libelle: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gris">
        <span>{libelle}</span>
        <b className="text-nuit">{part} %</b>
      </div>
      <div className="h-2 rounded-full bg-lavande-2">
        <div className="h-2 rounded-full bg-marque" style={{ width: `${Math.min(100, part)}%` }} />
      </div>
    </div>
  );
}

function Centre({ centre: c }: { centre: ActiviteCentre }) {
  const remplissage = c.remplissage.capacite ? Math.round((c.remplissage.prises / c.remplissage.capacite) * 100) : 0;
  return (
    <article className="flex flex-col gap-3 rounded-carte bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-lavande-2 text-marque">
          <Icone nom="hi-ambulatory-clinic" className="size-7" />
        </span>
        <div>
          <h3 className="font-bold">{c.nom}</h3>
          <p className="text-sm text-gris">{c.commune}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mesure valeur={String(c.consultations)} libelle="consultations et vaccins" />
        <Mesure valeur={c.attenteMoyenne === null ? "–" : `${c.attenteMoyenne} min`} libelle="d'attente en salle" />
        <Mesure valeur={String(c.alertes.total)} libelle={c.alertes.total > 1 ? "alertes" : "alerte"} />
        <Mesure
          valeur={c.alertes.delaiMoyen === null ? "–" : `${c.alertes.delaiMoyen} min`}
          libelle="pour prendre une alerte"
          alerte={c.alertes.delaiMoyen !== null && c.alertes.delaiMoyen > 15}
        />
      </dl>
      {c.alertes.partSous15 !== null && <Barre part={c.alertes.partSous15} libelle="Alertes prises en charge en 15 minutes" />}
      <Barre part={remplissage} libelle={`Places des 7 prochains jours : ${c.remplissage.prises} sur ${c.remplissage.capacite}`} />
    </article>
  );
}

function Relais({ relais: r }: { relais: ActiviteRelais }) {
  const couverture = r.foyers ? Math.round((r.foyersVisites / r.foyers) * 100) : 0;
  return (
    <article className="flex flex-col gap-3 rounded-carte bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-lavande-2 text-marque">
          <Icone nom="hi-community-healthworker" className="size-7" />
        </span>
        <h3 className="font-bold">{r.nom}</h3>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mesure valeur={String(r.foyers)} libelle="foyers suivis" />
        <Mesure valeur={String(r.personnes)} libelle="personnes" />
        <Mesure valeur={String(r.visites)} libelle="visites à domicile" />
        <Mesure valeur={String(r.aOrienter)} libelle="orientées vers le centre" />
      </dl>
      <Barre part={couverture} libelle={`Foyers visités en 30 jours : ${r.foyersVisites} sur ${r.foyers}`} />
    </article>
  );
}
