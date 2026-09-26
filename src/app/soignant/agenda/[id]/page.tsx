import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ajouterJours, aujourdhuiAuBenin, libelleAge } from "@/domain/dates";
import { LIBELLES_MOTIF, LIBELLES_PLAGE } from "@/domain/rendez-vous";
import { dateLongue, LIBELLE_MOMENT_RDV, majuscule } from "@/domain/temps";
import { db } from "@/server/db/client";
import { CAPACITE_MAX, detailPlage } from "@/server/soignant/agenda";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { Places } from "@/ui/Places";
import { RetourAction } from "@/ui/RetourAction";
import { donnerPlaceAction, modifierCapaciteAction } from "../../actions";
import { exigerSoignant } from "../../contexte";

export const metadata: Metadata = { title: "Plage de l'agenda" };

const REUSSITES: Record<string, string> = {
  ouverte: "Plage ouverte : les familles peuvent déjà y réserver une place.",
  capacite: "Nombre de places enregistré.",
  place_donnee: "Place donnée : la personne voit son rendez-vous dans son carnet.",
};
const REFUS: Record<string, string> = {
  trop_bas: "Impossible : des personnes sont déjà inscrites sur ces places.",
  invalide: "Nombre de places impossible (entre 1 et 60).",
  complet: "La plage est complète : ajoutez une place avant de la donner.",
  introuvable: "Cette personne n'est plus en liste d'attente.",
  interdit: "Cette plage n'est pas celle de votre centre.",
};

/** Une plage : qui vient, qui attend, et combien de places (spec §4.4). */
export default async function DetailPlage({ params, searchParams }: PageProps<"/soignant/agenda/[id]">) {
  const soignant = await exigerSoignant();
  const [{ id }, recherche] = await Promise.all([params, searchParams]);
  const detail = await detailPlage(db(), soignant.etablissementId, id);
  if (!detail) notFound();
  const { plage, inscrits, attente } = detail;
  const aujourdhui = aujourdhuiAuBenin();
  const passee = plage.date < aujourdhui;
  const libres = plage.capacite - plage.prises;
  // Le retour à l'agenda montre la plage : les 7 jours à venir si elle y est, sinon les 7 jours qui partent d'elle.
  const dansLaFenetre = plage.date >= aujourdhui && plage.date <= ajouterJours(aujourdhui, 6);
  const note = typeof recherche.note === "string" ? recherche.note : "";

  return (
    <>
      <Link href={`/soignant/agenda${dansLaFenetre ? "" : `?du=${plage.date}`}`} className="flex items-center gap-1.5 self-start text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Agenda
      </Link>
      <header className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-marque">
          <Icone nom={ICONE_MOTIF[plage.motif]} className="size-9" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">{LIBELLES_PLAGE[plage.motif]}</h1>
          <p className="mt-1 text-gris">
            {majuscule(dateLongue(plage.date))}, {LIBELLE_MOMENT_RDV[plage.moment]}
            {passee ? " · plage passée" : ""}
          </p>
        </div>
      </header>
      {REUSSITES[note] && <RetourAction message={REUSSITES[note]} />}
      {REFUS[note] && (
        <p role="alert" className="rounded-carte bg-soleil-pale px-4 py-3 font-bold">
          {REFUS[note]}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <section aria-labelledby="titre-inscrits" className="rounded-carte bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="titre-inscrits" className="text-lg font-bold">
                Personnes inscrites
              </h2>
              <span className="text-sm text-gris">{inscrits.length}</span>
            </div>
            {inscrits.length ? (
              <ol className="mt-3">
                {inscrits.map((p, i) => (
                  <li key={p.rendezVousId}>
                    <Link href={`/soignant/patients/${p.patientId}`} className={`grid grid-cols-[26px_1fr_auto] items-center gap-3 rounded-2xl px-2 py-2 text-sm ${i % 2 ? "" : "bg-lavande"}`}>
                      <span className="font-bold text-gris tabular-nums">{i + 1}</span>
                      <span className="min-w-0">
                        <b>
                          {p.prenom} {p.nom}
                        </b>
                        <small className="block text-gris">
                          {libelleAge(p.naissance, aujourdhui)}
                          {p.motif !== plage.motif ? ` · ${LIBELLES_MOTIF[p.motif].toLowerCase()}` : ""}
                        </small>
                      </span>
                      <Icone nom="ph-caret-right" className="size-4 text-marque" />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-gris">Personne n&apos;est encore inscrit.</p>
            )}
          </section>

          <section aria-labelledby="titre-attente" className="rounded-carte bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="titre-attente" className="text-lg font-bold">
                Liste d&apos;attente
              </h2>
              <span className="text-sm text-gris">{attente.length}</span>
            </div>
            {attente.length ? (
              <ol className="mt-3 flex flex-col gap-2">
                {attente.map((p) => (
                  <li key={p.attenteId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-lavande px-3 py-2 text-sm">
                    <Link href={`/soignant/patients/${p.patientId}`} className="min-w-0 flex-1">
                      <b>
                        {p.prenom} {p.nom}
                      </b>
                      <small className="block text-gris">
                        {libelleAge(p.naissance, aujourdhui)} · {LIBELLES_MOTIF[p.motif].toLowerCase()}
                      </small>
                    </Link>
                    {!passee && (
                      <form action={donnerPlaceAction}>
                        <input type="hidden" name="creneauId" value={plage.creneauId} />
                        <input type="hidden" name="attenteId" value={p.attenteId} />
                        <button disabled={libres <= 0} className="rounded-bouton bg-marque px-3 py-2 font-bold text-white disabled:bg-lavande-3 disabled:text-gris">
                          Donner la place
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-gris">Personne n&apos;attend une place sur cette plage.</p>
            )}
            {attente.length > 0 && libres <= 0 && !passee && <p className="mt-3 text-sm text-gris">Ajoutez une place pour la donner à une personne qui attend.</p>}
          </section>
        </div>

        <section aria-labelledby="titre-places" className="flex flex-col gap-3 rounded-carte bg-white p-5">
          <h2 id="titre-places" className="text-lg font-bold">
            Places
          </h2>
          <p className="text-3xl font-bold tabular-nums">
            {plage.prises} <span className="text-lg text-gris">sur {plage.capacite}</span>
          </p>
          <Places prises={plage.prises} capacite={plage.capacite} />
          <p className="text-sm text-gris">{libres > 0 ? `${libres} place${libres > 1 ? "s" : ""} libre${libres > 1 ? "s" : ""}` : "Complet"}</p>
          {!passee && (
            <div className="flex flex-col gap-2">
              <form action={modifierCapaciteAction}>
                <input type="hidden" name="creneauId" value={plage.creneauId} />
                <input type="hidden" name="capacite" value={plage.capacite - 1} />
                <button
                  disabled={plage.capacite - 1 < Math.max(1, plage.prises)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-bouton bg-lavande-2 py-2.5 font-bold text-marque disabled:opacity-50"
                >
                  <Icone nom="ph-minus" className="size-5" />
                  Retirer une place
                </button>
              </form>
              <form action={modifierCapaciteAction}>
                <input type="hidden" name="creneauId" value={plage.creneauId} />
                <input type="hidden" name="capacite" value={plage.capacite + 1} />
                <button disabled={plage.capacite >= CAPACITE_MAX} className="flex w-full items-center justify-center gap-1.5 rounded-bouton bg-marque py-2.5 font-bold text-white disabled:opacity-50">
                  <Icone nom="ph-plus" className="size-5" />
                  Ajouter une place
                </button>
              </form>
            </div>
          )}
          <p className="text-xs text-gris">Le nombre de places ne descend jamais sous le nombre de personnes inscrites.</p>
        </section>
      </div>
    </>
  );
}
