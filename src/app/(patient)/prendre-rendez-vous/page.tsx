import Link from "next/link";
import { notFound } from "next/navigation";
import { ajouterJours, type DateISO } from "@/domain/dates";
import type { MotifRdv } from "@/domain/programmes";
import { joursProposes, LIBELLES_MOTIF, LIBELLES_PLAGE, libellePlaces, motifDePlage, motifsProposes, type JourPropose } from "@/domain/rendez-vous";
import { dateLongue, LIBELLE_MOMENT_RDV, majuscule } from "@/domain/temps";
import { db } from "@/server/db/client";
import { etablissementDuPatient, type Carnet } from "@/server/requetes/carnets";
import { listeAttenteDe, placesDisponibles, rendezVousVus } from "@/server/requetes/rendez-vous";
import { iconePourPersonne, libelleLien } from "@/ui/avatar";
import { BandeauHorsLigne } from "@/ui/BandeauHorsLigne";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { BoutonEnvoi } from "@/ui/BoutonEnvoi";
import { EnTeteQuestion } from "@/ui/EnTeteQuestion";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { JourDisponible } from "@/ui/JourDisponible";
import { Ondes } from "@/ui/Ondes";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { RetourAction } from "@/ui/RetourAction";
import { TuileChoix } from "@/ui/TuileChoix";
import { listeAttenteAction, reserverAction } from "../actions";
import { contextePatient, texteDe } from "../contexte";

const PAGE = "cascade flex flex-1 flex-col gap-5 px-4 pt-5 pb-6";
const BOUTON = "flex h-14 w-full items-center justify-center gap-2 rounded-bouton bg-marque text-lg font-bold text-white disabled:opacity-60";
const HORS_LIGNE = "Pas de réseau pour le moment. Pour réserver, il faut le réseau. Vous pouvez aussi demander à votre relais.";
const ERREURS: Record<string, string> = {
  complet: "Ce jour vient d'être complet. Choisissez un autre jour.",
  deja_reserve: "Il y a déjà un rendez-vous ce jour-là. Choisissez un autre jour.",
  passe: "Ce jour n'est plus proposé. Choisissez un autre jour.",
  introuvable: "Ce jour n'est plus proposé. Choisissez un autre jour.",
};

const lien = (params: Record<string, string>) => `/prendre-rendez-vous?${new URLSearchParams(params)}`;

export default async function PrendreRendezVous({ searchParams }: PageProps<"/prendre-rendez-vous">) {
  const params = await searchParams;
  const { aujourdhui, carnets } = await contextePatient();
  const fait = texteDe(params.fait);
  if (fait) return <Enregistre rendezVousId={fait} carnets={carnets} aujourdhui={aujourdhui} />;
  const attente = texteDe(params.attente);
  if (attente) return <SurListeAttente attenteId={attente} carnets={carnets} />;

  // Étape 1 : pour qui ? (sautée quand le carnet n'a qu'une personne)
  const personne = carnets.find((c) => c.patientId === texteDe(params.pour)) ?? (carnets.length === 1 ? carnets[0] : undefined);
  if (!personne) return <PourQui carnets={carnets} />;

  // Étape 2 : pour quoi ?
  const motifs = motifsProposes(personne);
  const motif = motifs.find((m) => m === texteDe(params.motif));
  if (!motif) return <PourQuoi personne={personne} motifs={motifs} retour={carnets.length > 1 ? "/prendre-rendez-vous" : "/"} />;

  // Étape 3 : quel jour ?
  const creneaux = await placesDisponibles(db(), {
    etablissementId: personne.etablissementId,
    motif: motifDePlage(motif),
    du: ajouterJours(aujourdhui, 1),
    au: ajouterJours(aujourdhui, 21),
  });
  const jours = joursProposes(creneaux, aujourdhui);
  const jour = jours.find((j) => j.id === texteDe(params.creneau));
  if (!jour) return <QuelJour personne={personne} motif={motif} jours={jours} erreur={texteDe(params.erreur)} />;

  // Étape 4 : c'est bien ça ?
  const centre = await etablissementDuPatient(db(), personne.patientId);
  return <Recapitulatif personne={personne} motif={motif} jour={jour} centre={centre?.nom ?? "Centre de santé"} />;
}

function PourQui({ carnets }: { carnets: Carnet[] }) {
  return (
    <main className={PAGE}>
      <EnTeteQuestion
        retour="/"
        etape={1}
        question="Pour qui est le rendez-vous ?"
        aide="Touchez une personne"
        ecoute={`Pour qui est le rendez-vous ? ${carnets.map((c) => c.prenom).join(", ")}.`}
      />
      <BandeauHorsLigne message={HORS_LIGNE} />
      <ul className="flex flex-col gap-2.5">
        {carnets.map((c) => (
          <li key={c.patientId}>
            <Link href={lien({ pour: c.patientId })} className="flex items-center gap-3 rounded-carte bg-white p-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lavande-2 text-marque">
                <Icone nom={iconePourPersonne(c.sexe, c.age)} className="size-8" />
              </span>
              <span className="flex-1">
                <b className="block text-lg">{c.prenom}</b>
                <span className="text-sm text-gris">
                  {libelleLien(c.lien, c.sexe)}, {c.libelleAge}
                </span>
              </span>
              <Icone nom="ph-caret-right" className="size-5 text-gris" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function questionPourquoi(personne: Carnet): string {
  if (personne.lien === "soi") return "Pourquoi venez-vous ?";
  return `Pourquoi ${personne.prenom} doit-${personne.sexe === "F" ? "elle" : "il"} venir ?`;
}

function PourQuoi({ personne, motifs, retour }: { personne: Carnet; motifs: MotifRdv[]; retour: string }) {
  const question = questionPourquoi(personne);
  return (
    <main className={PAGE}>
      <EnTeteQuestion
        retour={retour}
        etape={2}
        question={question}
        aide="Touchez une image"
        ecoute={`${question} ${motifs.map((m) => LIBELLES_MOTIF[m]).join(", ")}.`}
      />
      <div className="grid grid-cols-2 gap-2.5">
        {motifs.map((m) => (
          <TuileChoix key={m} href={lien({ pour: personne.patientId, motif: m })} icone={ICONE_MOTIF[m]} libelle={LIBELLES_MOTIF[m]} />
        ))}
      </div>
    </main>
  );
}

function QuelJour({ personne, motif, jours, erreur }: { personne: Carnet; motif: MotifRdv; jours: JourPropose[]; erreur?: string }) {
  const ecoute = jours.map((j) => `${j.libelle}, ${LIBELLE_MOMENT_RDV[j.moment]}, ${j.complet ? "complet" : libellePlaces(j.places)}`).join(". ");
  return (
    <main className={PAGE}>
      <EnTeteQuestion
        retour={lien({ pour: personne.patientId })}
        etape={3}
        question="Quel jour ?"
        aide={`${LIBELLES_PLAGE[motif]} au centre de santé`}
        ecoute={`Quel jour ? ${ecoute}.`}
      />
      {erreur && ERREURS[erreur] && (
        <p role="alert" className="rounded-bouton bg-soleil-pale px-4 py-3 font-bold">
          {ERREURS[erreur]}
        </p>
      )}
      {jours.length === 0 ? (
        <p className="rounded-carte bg-white p-4">Pas de place dans les 3 prochaines semaines. Appelez le centre de santé ou demandez à votre relais.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {jours.map((j) => (
            <li key={j.id}>
              <JourDisponible jour={j} href={lien({ pour: personne.patientId, motif, creneau: j.id })} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Ligne({ icone, titre, valeur }: { icone: NomIcone; titre: string; valeur: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
        <Icone nom={icone} className="size-6" />
      </span>
      <div>
        <dt className="text-xs font-bold text-gris">{titre}</dt>
        <dd className="font-bold">{valeur}</dd>
      </div>
    </div>
  );
}

function Recapitulatif({ personne, motif, jour, centre }: { personne: Carnet; motif: MotifRdv; jour: JourPropose; centre: string }) {
  const quand = `${majuscule(dateLongue(jour.date))}, ${LIBELLE_MOMENT_RDV[jour.moment]}`;
  const ecoute = jour.complet
    ? `${quand} est complet. Voulez-vous être sur la liste d'attente ? Si une place se libère, on vous prévient.`
    : `Rendez-vous pour ${personne.prenom} : ${LIBELLES_MOTIF[motif]}, ${quand}, au ${centre}. Touchez « Confirmer le rendez-vous ».`;
  return (
    <main className={PAGE}>
      <EnTeteQuestion
        retour={lien({ pour: personne.patientId, motif })}
        etape={4}
        question={jour.complet ? "Ce jour est complet" : "C'est bien ça ?"}
        aide={jour.complet ? "Vous pouvez attendre qu'une place se libère" : undefined}
        ecoute={ecoute}
      />
      <BandeauHorsLigne message={HORS_LIGNE} />
      <dl className="flex flex-col gap-3 rounded-carte bg-white p-4">
        <Ligne icone={iconePourPersonne(personne.sexe, personne.age)} titre="Pour" valeur={personne.prenom} />
        <Ligne icone={ICONE_MOTIF[motif]} titre="Pour quoi" valeur={LIBELLES_MOTIF[motif]} />
        <Ligne icone="ph-calendar-check" titre="Quand" valeur={quand} />
        <Ligne icone="ph-map-pin" titre="Où" valeur={centre} />
      </dl>
      <form action={jour.complet ? listeAttenteAction : reserverAction} className="mt-auto flex flex-col gap-3">
        <input type="hidden" name="patientId" value={personne.patientId} />
        <input type="hidden" name="motif" value={motif} />
        <input type="hidden" name="creneauId" value={jour.id} />
        <BoutonEnvoi className={BOUTON} enCours="Envoi en cours…" horsLigne="Pas de réseau : la demande partira dès que le réseau revient.">
          <Icone nom={jour.complet ? "ph-hourglass-medium" : "ph-calendar-check"} className="size-6" />
          {jour.complet ? "M'inscrire sur la liste d'attente" : "Confirmer le rendez-vous"}
        </BoutonEnvoi>
        {jour.complet && (
          <Link href={lien({ pour: personne.patientId, motif })} className="text-center font-bold text-marque">
            Choisir un autre jour
          </Link>
        )}
      </form>
    </main>
  );
}

async function Enregistre({ rendezVousId, carnets, aujourdhui }: { rendezVousId: string; carnets: Carnet[]; aujourdhui: DateISO }) {
  const rdv = (await rendezVousVus(db(), carnets.map((c) => c.patientId), aujourdhui)).find((r) => r.id === rendezVousId);
  const personne = carnets.find((c) => c.patientId === rdv?.patientId);
  if (!rdv || !personne) notFound();
  const quand = `${majuscule(dateLongue(rdv.datePrevue))}${rdv.moment ? `, ${LIBELLE_MOMENT_RDV[rdv.moment]}` : ""}`;
  return (
    <main className={PAGE}>
      <RetourAction message="Rendez-vous enregistré" />
      <section className="relative flex flex-col items-center gap-2 overflow-hidden rounded-grande bg-marque p-6 text-center text-white">
        <Ondes className="-top-10 -right-10 size-44 text-white opacity-15" />
        <span className="relative grid size-16 place-items-center rounded-full bg-white text-marque">
          <Icone nom="ph-check" className="size-9" />
        </span>
        <h1 className="relative text-2xl font-bold">C&apos;est enregistré</h1>
        <p className="relative text-lavande-3">
          {rdv.libelle} pour {personne.prenom}
        </p>
        <p className="relative text-xl font-bold">{quand}</p>
        <p className="relative text-sm text-lavande-3">{rdv.etablissement}</p>
        <BoutonEcouter
          libelle="Écouter"
          texte={`C'est enregistré. ${rdv.libelle} pour ${personne.prenom}, ${quand}, au ${rdv.etablissement}. Venez avec le carnet.`}
          className="relative mt-2"
        />
      </section>
      <p className="rounded-carte bg-white p-4 text-sm">Venez avec le carnet. Si vous ne pouvez pas venir, prévenez le centre : la place servira à quelqu&apos;un d&apos;autre.</p>
      <Link href="/" className={`mt-auto ${BOUTON}`}>
        Retour à l&apos;accueil
      </Link>
      <Link href="/rendez-vous" className="text-center font-bold text-marque">
        Voir mes rendez-vous
      </Link>
    </main>
  );
}

async function SurListeAttente({ attenteId, carnets }: { attenteId: string; carnets: Carnet[] }) {
  const attente = (await listeAttenteDe(db(), carnets.map((c) => c.patientId))).find((a) => a.id === attenteId);
  const personne = carnets.find((c) => c.patientId === attente?.patientId);
  if (!attente || !personne) notFound();
  return (
    <main className={PAGE}>
      <RetourAction message="Vous êtes sur la liste d'attente" />
      <section className="flex flex-col gap-2 rounded-grande bg-white p-5">
        <Icone nom="ph-hourglass-medium" className="size-10 text-marque" />
        <h1 className="text-xl font-bold">Liste d&apos;attente</h1>
        <p>
          {LIBELLES_MOTIF[attente.motif]} pour {personne.prenom}, {dateLongue(attente.dateSouhaitee)}, {LIBELLE_MOMENT_RDV[attente.moment]}.
        </p>
        <p className="text-gris">Si une place se libère, on vous prévient. Vous pouvez aussi choisir un autre jour.</p>
      </section>
      <Link href={lien({ pour: personne.patientId, motif: attente.motif })} className={BOUTON}>
        Choisir un autre jour
      </Link>
      <Link href="/" className="text-center font-bold text-marque">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
