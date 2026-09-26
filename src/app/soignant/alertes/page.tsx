import type { Metadata } from "next";
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { LIBELLES_SIGNES } from "@/domain/signes-danger";
import { dateCourte, heureMinute } from "@/domain/temps";
import { db } from "@/server/db/client";
import { alertesDuCentre, type AlerteDuCentre, type StatutAlerte } from "@/server/soignant/activite";
import { Actualisation } from "@/ui/Actualisation";
import { Chiffre } from "@/ui/Chiffre";
import { Icone } from "@/ui/Icone";
import { prendreEnChargeAction } from "../actions";
import { exigerSoignant } from "../contexte";

export const metadata: Metadata = { title: "Alertes" };

const JOURS = 30;

const STATUTS: Record<StatutAlerte, { libelle: string; classe: string }> = {
  en_retard: { libelle: "En retard", classe: "bg-urgence text-white" },
  en_cours: { libelle: "À prendre", classe: "bg-soleil text-nuit" },
  prise: { libelle: "Prise en charge", classe: "bg-lavande-2 text-marque" },
  annulee: { libelle: "Annulée par la famille", classe: "bg-lavande-2 text-gris" },
};

/** L'historique des alertes du centre et la tenue du délai de 15 minutes (spec §4.6). */
export default async function Alertes() {
  const soignant = await exigerSoignant();
  const maintenant = new Date();
  const depuis = new Date(Date.parse(`${aujourdhuiAuBenin(maintenant)}T00:00:00+01:00`) - JOURS * 86_400_000);
  const { alertes, bilan } = await alertesDuCentre(db(), soignant.etablissementId, depuis, maintenant);

  return (
    <>
      <Actualisation />
      <header>
        <h1 className="text-3xl font-bold">Alertes</h1>
        <p className="mt-1 text-gris">Les signes de danger signalés par les familles ces {JOURS} derniers jours.</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre valeur={String(bilan.total)} libelle={bilan.total > 1 ? "alertes" : "alerte"} />
        <Chiffre valeur={bilan.delaiMoyen === null ? "–" : `${bilan.delaiMoyen} min`} libelle="délai moyen de prise en charge" />
        <Chiffre valeur={bilan.partSous15 === null ? "–" : `${bilan.partSous15} %`} libelle="prises en charge en 15 min" alerte={bilan.partSous15 !== null && bilan.partSous15 < 80} />
        <Chiffre valeur={String(bilan.enCours + bilan.enRetard)} libelle="à prendre maintenant" alerte={bilan.enCours + bilan.enRetard > 0} />
      </dl>
      <section aria-labelledby="titre-historique" className="rounded-carte bg-white p-5">
        <h2 id="titre-historique" className="text-lg font-bold">
          Historique
        </h2>
        {alertes.length ? (
          <ul className="mt-3 flex flex-col gap-2">
            {alertes.map((a) => (
              <Ligne key={a.id} alerte={a} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-gris">Aucune alerte ces {JOURS} derniers jours.</p>
        )}
      </section>
    </>
  );
}

function Ligne({ alerte: a }: { alerte: AlerteDuCentre }) {
  const statut = STATUTS[a.statut];
  const ouverte = a.statut === "en_cours" || a.statut === "en_retard";
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl p-3 ${ouverte ? "bg-urgence-pale" : "bg-lavande"}`}>
      <span className={`w-36 shrink-0 rounded-lg px-2 py-1 text-center text-xs font-bold ${statut.classe}`}>{statut.libelle}</span>
      <div className="min-w-[200px] flex-1">
        <Link href={`/soignant/patients/${a.patientId}`} className="font-bold">
          {a.prenom} {a.nom}
        </Link>
        <p className="flex items-center gap-1.5 text-sm text-gris">
          <Icone nom="hi-alert-circle" className="size-4 shrink-0 text-urgence" />
          {a.signes.map((s) => LIBELLES_SIGNES[s]).join(", ")} · le {dateCourte(aujourdhuiAuBenin(a.creeeLe))} à {heureMinute(a.creeeLe)}
        </p>
      </div>
      {a.delaiMinutes !== null && (
        <p className="flex items-center gap-1.5 text-sm">
          <Icone nom="ph-timer" className={`size-5 ${a.delaiMinutes > 15 ? "text-urgence" : "text-marque"}`} />
          <span>
            Prise en <b className={a.delaiMinutes > 15 ? "text-urgence" : ""}>{a.delaiMinutes} min</b>
            {a.prisePar ? ` par ${a.prisePar}` : ""}
          </span>
        </p>
      )}
      {ouverte && (
        <form action={prendreEnChargeAction}>
          <input type="hidden" name="alerteId" value={a.id} />
          <button className="rounded-bouton bg-urgence px-4 py-2 text-sm font-bold text-white">Prendre en charge</button>
        </form>
      )}
    </li>
  );
}
