import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { LIBELLES_CONSTAT } from "@/domain/evenements";
import { dateCourte, dateLongue, heureMinute } from "@/domain/temps";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import { db } from "@/server/db/client";
import type { EtapeDuCarnet } from "@/server/requetes/carnet";
import type { OrdonnanceDetaillee } from "@/server/requetes/ordonnances";
import type { MesureDatee } from "@/server/requetes/risques";
import { dossierPatient, type VisiteRelais } from "@/server/requetes/soignant";
import { iconePourPersonne } from "@/ui/avatar";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { CodeRetrait } from "@/ui/CodeRetrait";
import { EtiquetteRisque } from "@/ui/EtiquetteRisque";
import { Icone } from "@/ui/Icone";
import { Posologie } from "@/ui/Posologie";
import { RetourAction } from "@/ui/RetourAction";
import { Tampon } from "@/ui/Tampon";
import { exigerSoignant } from "../../contexte";

const LANGUES: Record<string, string> = { fr: "français", fon: "fon", adja: "adja", yo: "yoruba", bariba: "bariba", dendi: "dendi" };
const CANAUX: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", vocal: "appel vocal", relais: "par le relais" };
const texteDe = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function DossierPatient({ params, searchParams }: PageProps<"/soignant/patients/[id]">) {
  const soignant = await exigerSoignant();
  const [{ id }, recherche] = await Promise.all([params, searchParams]);
  const dossier = await dossierPatient(db(), soignant.etablissementId, id, aujourdhuiAuBenin());
  if (!dossier) notFound();
  const { patient, risque } = dossier;
  const telephone = patient.telephone ? normaliserTelephone(patient.telephone) : null;
  const note = texteDe(recherche.note);
  const code = texteDe(recherche.code);

  return (
    <>
      <Link href="/soignant" className="flex w-fit items-center gap-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Aujourd&apos;hui
      </Link>
      {note === "consultation" && <RetourAction message="Consultation enregistrée. Le risque est à jour." />}
      {note === "alerte" && <RetourAction message={`Alerte prise en charge. Rappelez ${patient.prenom} maintenant.`} />}
      {note === "ordonnance" && code && (
        <div className="flex flex-wrap items-center gap-4">
          <RetourAction message="Ordonnance enregistrée. Donnez ce code au patient pour la pharmacie." />
          <CodeRetrait code={code} />
        </div>
      )}
      <header className="flex flex-wrap items-center gap-4 rounded-carte bg-white p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-lavande-2 text-marque">
          <Icone nom={iconePourPersonne(patient.sexe, patient.age)} className="size-9" />
        </span>
        <div className="min-w-[220px] flex-1">
          <h1 className="text-2xl font-bold">
            {patient.prenom} {patient.nom}
          </h1>
          <p className="text-sm text-gris">
            {patient.libelleAge}
            {patient.village ? ` · ${patient.village}` : ""} · carnet {patient.codeCourt} · parle {LANGUES[patient.langue] ?? patient.langue} · rappels{" "}
            {CANAUX[patient.canalPrefere] ?? patient.canalPrefere}
            {patient.malvoyant ? " · malvoyant·e" : ""}
            {patient.malentendant ? " · malentendant·e" : ""}
          </p>
        </div>
        {telephone && (
          <a href={`tel:${telephone}`} className="flex items-center gap-2 rounded-bouton bg-lavande px-4 py-2.5 text-sm font-bold">
            <Icone nom="ph-phone" className="size-5" />
            {formaterTelephone(telephone)}
          </a>
        )}
        <Link href={`/soignant/patients/${patient.id}/consultation`} className="flex items-center gap-2 rounded-bouton bg-marque px-4 py-2.5 text-sm font-bold text-white">
          <Icone nom="hi-stethoscope" className="size-5" />
          Nouvelle consultation
        </Link>
        <Link href={`/soignant/patients/${patient.id}/ordonnance`} className="flex items-center gap-2 rounded-bouton bg-lavande-2 px-4 py-2.5 text-sm font-bold text-marque">
          <Icone nom="ph-prescription" className="size-5" />
          Ordonnance
        </Link>
      </header>
      {dossier.alertesOuvertes > 0 && (
        <p role="alert" className="flex items-center gap-2 rounded-carte bg-urgence-pale px-4 py-3 font-bold text-urgence">
          <Icone nom="hi-alert-circle" className="size-5" />
          Signe de danger en attente de prise en charge : voir{" "}
          <Link href="/soignant" className="underline">
            Aujourd&apos;hui
          </Link>
          .
        </p>
      )}
      <section aria-labelledby="titre-risque" className="flex flex-col gap-2 rounded-carte bg-white p-5">
        <div className="flex items-center gap-3">
          <h2 id="titre-risque" className="text-lg font-bold">
            Risque
          </h2>
          <EtiquetteRisque niveau={risque.global.niveau} />
        </div>
        {risque.global.motifs.length === 0 ? (
          <p className="text-gris">Rien d&apos;inquiétant dans les relevés et les rendez-vous.</p>
        ) : (
          <ul className="list-disc pl-5">
            {risque.global.motifs.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section aria-labelledby="titre-programmes" className="flex flex-col gap-4 rounded-carte bg-white p-5">
          <h2 id="titre-programmes" className="text-lg font-bold">
            Suivi
          </h2>
          {dossier.programmes.length === 0 && <p className="text-gris">Aucun programme de suivi.</p>}
          {dossier.programmes.map((p) => (
            <div key={p.code}>
              <b className="block">{p.nom}</b>
              {p.etapes.length === 0 ? (
                <p className="text-sm text-gris">Consultations à la demande.</p>
              ) : (
                <ul className="mt-1.5 flex flex-col">
                  {p.etapes.map((e, i) => (
                    <LigneEtape key={e.code} etape={e} rang={i} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
        <Releves mesures={dossier.mesures} />
        <Visites visites={dossier.visites} />
      </div>
      <Ordonnances ordonnances={dossier.ordonnances} />
    </>
  );
}

function LigneEtape({ etape, rang }: { etape: EtapeDuCarnet; rang: number }) {
  return (
    <li className="flex items-center gap-3 border-b border-lavande-2 py-1.5 text-sm last:border-0">
      <span className="grid w-9 shrink-0 place-items-center">
        {etape.statut === "faite" ? (
          <Tampon libelle="Fait" className="size-8" rang={rang} />
        ) : (
          <span aria-hidden="true" className={`size-7 rounded-full ${etape.statut === "manquee" ? "bg-soleil-pale" : "border-2 border-lavande-3"}`} />
        )}
      </span>
      <span className="flex-1">{etape.libelle}</span>
      <span className={`text-xs font-bold ${etape.statut === "manquee" ? "text-soleil-appuye" : "text-gris"}`}>
        {etape.statut === "faite" && etape.faite
          ? `Fait le ${dateCourte(aujourdhuiAuBenin(etape.faite.le))}`
          : etape.statut === "manquee"
            ? "Manqué"
            : etape.reservation
              ? `Réservé : ${dateCourte(etape.reservation.date)}`
              : `Prévu : ${dateCourte(etape.datePrevue)}`}
      </span>
    </li>
  );
}

function Releves({ mesures }: { mesures: MesureDatee[] }) {
  const recents = [...mesures].reverse().slice(0, 8);
  return (
    <section aria-labelledby="titre-releves" className="rounded-carte bg-white p-5">
      <h2 id="titre-releves" className="text-lg font-bold">
        Relevés
      </h2>
      {recents.length === 0 ? (
        <p className="mt-2 text-gris">Aucun relevé.</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-gris">
            <tr>
              <th className="py-1 font-bold">Date</th>
              <th className="font-bold">Tension</th>
              <th className="font-bold">Glycémie</th>
              <th className="font-bold">Poids</th>
              <th className="font-bold">Par</th>
            </tr>
          </thead>
          <tbody>
            {recents.map((m, i) => (
              <tr key={`${m.date}-${i}`} className="border-t border-lavande-2">
                <td className="py-1.5 tabular-nums">{dateCourte(m.date)}</td>
                <td className="tabular-nums">{m.tensionSys ? `${m.tensionSys}/${m.tensionDia}` : "—"}</td>
                <td className="tabular-nums">{m.glycemieGL ? `${m.glycemieGL} g/L` : "—"}</td>
                <td className="tabular-nums">{m.poidsKg ? `${m.poidsKg} kg` : "—"}</td>
                <td className="text-gris">{m.source === "mesure" ? "Relevé" : "Consultation"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Visites à domicile du relais, avec sa note vocale : ce qu'il a vu chez la personne. */
function Visites({ visites }: { visites: VisiteRelais[] }) {
  if (visites.length === 0) return null;
  return (
    <section aria-labelledby="titre-visites" className="flex flex-col gap-3 rounded-carte bg-white p-5">
      <h2 id="titre-visites" className="text-lg font-bold">
        Visites du relais
      </h2>
      <ul className="flex flex-col gap-3">
        {visites.map((v) => (
          <li key={v.id} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
              <Icone nom="hi-community-healthworker" className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {LIBELLES_CONSTAT[v.constat]}
                <span className="font-normal text-gris">
                  {" "}
                  · {dateCourte(aujourdhuiAuBenin(v.le))}, {heureMinute(v.le)} · {v.relais}
                </span>
              </p>
              {v.texte && <p className="text-sm">« {v.texte} »</p>}
              {v.note && (
                <BoutonEcouter
                  variante="complet"
                  libelle="Écouter la visite"
                  sousLibelle={`Note vocale de ${v.relais}`}
                  source={`/api/fichiers/${v.id}`}
                  className="mt-2"
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ordonnances({ ordonnances }: { ordonnances: OrdonnanceDetaillee[] }) {
  return (
    <section aria-labelledby="titre-ordonnances" className="flex flex-col gap-3 rounded-carte bg-white p-5">
      <h2 id="titre-ordonnances" className="text-lg font-bold">
        Ordonnances
      </h2>
      {ordonnances.length === 0 && <p className="text-gris">Aucune ordonnance.</p>}
      {ordonnances.map((o, i) => (
        <article key={o.id} className="flex flex-col gap-3 rounded-2xl bg-lavande p-4">
          <div className="flex flex-wrap items-center gap-3">
            <b className="flex-1">
              Le {dateLongue(aujourdhuiAuBenin(o.emiseLe))}, par {o.prescripteur}
            </b>
            {o.delivrance ? (
              <span className="flex items-center gap-2 text-sm font-bold text-marque">
                <Tampon libelle="Délivrée" className="size-10" rang={i} />
                Délivrée le {dateCourte(aujourdhuiAuBenin(o.delivrance.le))} à {heureMinute(o.delivrance.le)}, {o.delivrance.par}
              </span>
            ) : (
              <CodeRetrait code={o.codeRetrait} libelle="À retirer avec le code" />
            )}
          </div>
          {o.lignes.map((l) => (
            <div key={l.medicament} className="grid items-center gap-3 md:grid-cols-[1fr_320px]">
              <p>
                <b>{l.medicament}</b>
                <small className="block text-gris">
                  {l.indication ? `Pour ${l.indication} · ` : ""}
                  {l.dureeJours} jours{l.conseil ? ` · ${l.conseil}` : ""}
                </small>
              </p>
              <Posologie ligne={l} />
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
