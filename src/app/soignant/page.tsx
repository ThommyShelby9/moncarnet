import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { dateLongue, majuscule } from "@/domain/temps";
import { db } from "@/server/db/client";
import { alertesOuvertes, consultationsDuJour, patientsASurveiller, type GroupeDuJour, type PatientASurveiller } from "@/server/requetes/soignant";
import { Actualisation } from "@/ui/Actualisation";
import { EtiquetteRisque } from "@/ui/EtiquetteRisque";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { RetourAction } from "@/ui/RetourAction";
import { Tampon } from "@/ui/Tampon";
import { CarteAlerte } from "./CarteAlerte";
import { exigerSoignant } from "./contexte";
import { RechercheRapide } from "./RechercheRapide";

const MESSAGES: Record<string, string> = {
  deja_prise: "Un collègue a déjà pris cette alerte en charge.",
  annulee: "La famille a annulé cette alerte.",
  introuvable: "Cette alerte n'existe plus.",
};

export default async function Aujourdhui({ searchParams }: PageProps<"/soignant">) {
  const soignant = await exigerSoignant();
  const params = await searchParams;
  const aujourdhui = aujourdhuiAuBenin();
  const maintenant = new Date();
  const [alertes, groupes, aSurveiller] = await Promise.all([
    alertesOuvertes(db(), soignant.etablissementId, aujourdhui),
    consultationsDuJour(db(), soignant.etablissementId, aujourdhui),
    patientsASurveiller(db(), soignant.etablissementId, aujourdhui),
  ]);
  const lignes = groupes.flatMap((g) => g.lignes);
  const vus = lignes.filter((l) => l.vu).length;
  const note = typeof params.note === "string" ? MESSAGES[params.note] : undefined;

  return (
    <>
      <Actualisation />
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Aujourd&apos;hui</h1>
          <p className="mt-1 text-gris">
            {majuscule(dateLongue(aujourdhui))} : {lignes.length} rendez-vous, {vus} déjà vu{vus > 1 ? "s" : ""}
          </p>
        </div>
        <RechercheRapide />
      </header>
      {note && <RetourAction message={note} />}
      {alertes.length > 0 && (
        <section aria-labelledby="titre-alertes" className="flex flex-col gap-3">
          <h2 id="titre-alertes" className="sr-only">
            Alertes à prendre en charge
          </h2>
          {alertes.map((a) => (
            <CarteAlerte key={a.id} alerte={a} maintenant={maintenant} />
          ))}
        </section>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <ConsultationsDuJour groupes={groupes} />
        <ASurveiller patients={aSurveiller} />
      </div>
    </>
  );
}

function Places({ prises, capacite }: { prises: number; capacite: number }) {
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {Array.from({ length: Math.min(capacite, 12) }, (_, i) => (
        <i key={i} className={`size-2.5 rounded-full ${i < prises ? "bg-marque" : "bg-lavande-3"}`} />
      ))}
    </span>
  );
}

function ConsultationsDuJour({ groupes }: { groupes: GroupeDuJour[] }) {
  return (
    <section aria-labelledby="titre-jour" className="rounded-carte bg-white p-5">
      <h2 id="titre-jour" className="text-lg font-bold">
        Consultations du jour
      </h2>
      {groupes.length === 0 && <p className="mt-3 text-gris">Aucun rendez-vous aujourd&apos;hui.</p>}
      {groupes.map((g) => (
        <div key={g.cle}>
          <div className="mt-4 mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <b>{g.titre}</b>
            <span className="flex items-center gap-2 text-xs text-gris">
              {g.capacite !== null && <Places prises={g.lignes.length} capacite={g.capacite} />}
              {g.capacite !== null ? `${g.lignes.length} places prises sur ${g.capacite}` : `${g.lignes.length} personne${g.lignes.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <ul>
            {g.lignes.map((l, i) => (
              <li key={l.rendezVousId}>
                <Link
                  href={`/soignant/patients/${l.patientId}`}
                  className={`grid grid-cols-[26px_1fr_auto_64px] items-center gap-3 rounded-2xl px-2 py-2 text-sm ${i % 2 ? "bg-lavande" : ""}`}
                >
                  <span className="font-bold text-gris tabular-nums">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-2.5 font-bold">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
                      <Icone nom={ICONE_MOTIF[l.motif]} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      {l.prenom} {l.nom}
                      <small className="block truncate font-normal text-gris">
                        {l.libelleAge}, {l.libelle.toLowerCase()}
                      </small>
                    </span>
                  </span>
                  <EtiquetteRisque niveau={l.risque} />
                  <span className="flex justify-end">{l.vu ? <Tampon libelle="Vu" className="size-8" rang={i} /> : <span className="text-xs text-gris">Attendu</span>}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function ASurveiller({ patients }: { patients: PatientASurveiller[] }) {
  return (
    <section aria-labelledby="titre-surveiller" className="rounded-carte bg-white p-5">
      <h2 id="titre-surveiller" className="text-lg font-bold">
        À surveiller
      </h2>
      {patients.length === 0 ? (
        <p className="mt-3 text-gris">Aucun patient à risque pour le moment.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {patients.map((p) => (
            <li key={p.patientId}>
              <Link href={`/soignant/patients/${p.patientId}`} className="flex flex-col gap-1 rounded-2xl bg-lavande px-3 py-2.5 text-sm">
                <span className="flex items-center justify-between gap-2">
                  <b>
                    {p.prenom} {p.nom}
                  </b>
                  <EtiquetteRisque niveau={p.niveau} />
                </span>
                <small className="text-gris">
                  {p.libelleAge} · {p.motif}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
