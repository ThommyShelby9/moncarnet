import Link from "next/link";
import { aujourdhuiAuBenin, joursEntre, type DateISO } from "@/domain/dates";
import { semainesDeGrossesse, termePrevu } from "@/domain/programmes/grossesse";
import { dateCourte, dateLongue, LIBELLE_MOMENT_RDV, libelleDansJours, majuscule, moisEtAnnee } from "@/domain/temps";
import type { EtapeDuCarnet, ProgrammeDuCarnet } from "@/server/requetes/carnet";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { Tampon } from "@/ui/Tampon";

const lienReserver = (patientId: string, etape: EtapeDuCarnet) => `/prendre-rendez-vous?pour=${patientId}&motif=${etape.motif}`;

/** Un programme suivi, comme une page du carnet papier : chaque étape faite porte son tampon « VU ». */
export function SectionProgramme({ programme, patientId, aujourdhui }: { programme: ProgrammeDuCarnet; patientId: string; aujourdhui: DateISO }) {
  const prochaine = programme.etapes.find((e) => e.statut === "a_venir" && e.rendezVous);
  return (
    <section aria-labelledby={`programme-${programme.code}`} className="flex flex-col gap-2.5">
      <h2 id={`programme-${programme.code}`} className="text-lg font-bold">
        {programme.nom}
      </h2>
      {programme.code === "grossesse" && (
        <p className="-mt-1.5 text-sm text-gris">
          {semainesDeGrossesse(programme.dateReference, aujourdhui)} semaines · terme prévu le {dateLongue(termePrevu(programme.dateReference))}
        </p>
      )}
      {prochaine && <Prochaine etape={prochaine} patientId={patientId} />}
      <ol className="rounded-carte bg-white px-3.5 py-1">
        {programme.etapes.map((etape, index) => (
          <EtapeFrise key={etape.code} etape={etape} rang={index} prochaine={etape === prochaine} patientId={patientId} aujourdhui={aujourdhui} />
        ))}
      </ol>
    </section>
  );
}

function Prochaine({ etape, patientId }: { etape: EtapeDuCarnet; patientId: string }) {
  return (
    <div className="rounded-carte bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <small className="text-xs text-gris">Prochaine étape</small>
          <b className="block">{etape.libelle}</b>
          {etape.details && <small className="text-xs text-gris">{etape.details}</small>}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
          <Icone nom={ICONE_MOTIF[etape.motif]} className="size-6" />
        </span>
      </div>
      {etape.reservation ? (
        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-lavande-2 px-2.5 py-1.5 text-xs font-bold text-marque">
          <Icone nom="ph-check-circle" className="size-4" />
          Place réservée : {dateLongue(etape.reservation.date)}
          {etape.reservation.moment ? `, ${LIBELLE_MOMENT_RDV[etape.reservation.moment]}` : ""}
        </span>
      ) : (
        <Link href={lienReserver(patientId, etape)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-marque px-3 py-2 text-sm font-bold text-white">
          <Icone nom="ph-calendar-dots" className="size-4" />
          Choisir le jour
        </Link>
      )}
    </div>
  );
}

function EtapeFrise({
  etape,
  rang,
  prochaine,
  patientId,
  aujourdhui,
}: {
  etape: EtapeDuCarnet;
  rang: number;
  prochaine: boolean;
  patientId: string;
  aujourdhui: DateISO;
}) {
  const date = etape.reservation?.date ?? etape.datePrevue;
  return (
    <li className="grid grid-cols-[40px_1fr_auto] items-center gap-2.5 border-b border-lavande-2 py-2 last:border-0">
      {etape.statut === "faite" ? (
        <Tampon rang={rang} libelle="Fait" className="size-9" />
      ) : etape.statut === "manquee" ? (
        <span className="grid size-[34px] place-items-center rounded-full bg-lavande-2 text-gris">
          <Icone nom="ph-warning-circle" className="size-5" titre="Manqué" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`size-[34px] rounded-full ${prochaine ? "border-[2.5px] border-dashed border-marque" : "border-2 border-lavande-3"}`}
        />
      )}
      <div className="min-w-0">
        <b className="block text-sm">{etape.libelle}</b>
        <small className="text-xs text-gris">
          {etape.statut === "faite" ? etape.faite?.lieu : etape.statut === "manquee" ? "Manqué : à rattraper" : (etape.details ?? "")}
        </small>
      </div>
      <span className={`text-right text-xs font-bold ${prochaine ? "text-marque" : "text-gris"}`}>
        {etape.statut === "faite" && etape.faite ? (
          dateCourte(aujourdhuiAuBenin(etape.faite.le))
        ) : etape.statut === "manquee" ? (
          <Link href={lienReserver(patientId, etape)} className="text-marque underline">
            Choisir un jour
          </Link>
        ) : prochaine ? (
          majuscule(libelleDansJours(joursEntre(aujourdhui, date)))
        ) : (
          moisEtAnnee(date)
        )}
      </span>
    </li>
  );
}
