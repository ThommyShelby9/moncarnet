import type { Metadata } from "next";
import Link from "next/link";
import { ajouterJours, aujourdhuiAuBenin, depuisDateISO, type DateISO } from "@/domain/dates";
import { LIBELLES_PLAGE } from "@/domain/rendez-vous";
import { dateLongue, majuscule } from "@/domain/temps";
import { db } from "@/server/db/client";
import { agendaDuCentre, CAPACITE_MAX, HORIZON_OUVERTURE, MOTIFS_DE_PLAGE, type PlageAgenda } from "@/server/soignant/agenda";
import { Chiffre } from "@/ui/Chiffre";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { Places } from "@/ui/Places";
import { ouvrirPlageAction } from "../actions";
import { exigerSoignant } from "../contexte";

export const metadata: Metadata = { title: "Agenda" };

const REFUS: Record<string, string> = {
  deja_ouverte: "Cette plage existe déjà ce jour-là : ouvrez-la dans l'agenda pour changer le nombre de places.",
  invalide: "Plage impossible : choisissez un jour dans les deux mois qui viennent et entre 1 et 60 places.",
};

const MOMENTS = { matin: "Matin", apres_midi: "Après-midi" } as const;

function lireJour(valeur: unknown, parDefaut: DateISO): DateISO {
  if (typeof valeur !== "string") return parDefaut;
  try {
    depuisDateISO(valeur);
    return valeur;
  } catch {
    return parDefaut;
  }
}

/** Les plages du centre sur 7 jours : places prises, plages complètes, liste d'attente ; et une plage à ouvrir (spec §4.4). */
export default async function Agenda({ searchParams }: PageProps<"/soignant/agenda">) {
  const soignant = await exigerSoignant();
  const params = await searchParams;
  const aujourdhui = aujourdhuiAuBenin();
  const debut = lireJour(params.du, aujourdhui);
  const plages = await agendaDuCentre(db(), soignant.etablissementId, debut, 7);
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(debut, i));
  const prises = plages.reduce((s, p) => s + p.prises, 0);
  const capacite = plages.reduce((s, p) => s + p.capacite, 0);
  const completes = plages.filter((p) => p.prises >= p.capacite).length;
  const enAttente = plages.reduce((s, p) => s + p.enAttente, 0);
  const refus = typeof params.note === "string" ? REFUS[params.note] : undefined;

  return (
    <>
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="mt-1 text-gris">
            Du {dateLongue(debut)} au {dateLongue(ajouterJours(debut, 6))}
          </p>
        </div>
        <nav aria-label="Période" className="flex items-center gap-2">
          <Link href={`/soignant/agenda?du=${ajouterJours(debut, -7)}`} className="grid size-11 place-items-center rounded-bouton bg-white text-marque">
            <Icone nom="ph-caret-left" className="size-5" titre="7 jours plus tôt" />
          </Link>
          {debut !== aujourdhui && (
            <Link href="/soignant/agenda" className="rounded-bouton bg-white px-4 py-2.5 text-sm font-bold text-marque">
              Aujourd&apos;hui
            </Link>
          )}
          <Link href={`/soignant/agenda?du=${ajouterJours(debut, 7)}`} className="grid size-11 place-items-center rounded-bouton bg-white text-marque">
            <Icone nom="ph-caret-right" className="size-5" titre="7 jours plus tard" />
          </Link>
        </nav>
      </header>
      {refus && (
        <p role="alert" className="rounded-carte bg-soleil-pale px-4 py-3 font-bold">
          {refus}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre valeur={`${prises} / ${capacite}`} libelle="places prises" />
        <Chiffre valeur={capacite ? `${Math.round((prises / capacite) * 100)} %` : "–"} libelle="de remplissage" />
        <Chiffre valeur={String(completes)} libelle={completes > 1 ? "plages complètes" : "plage complète"} />
        <Chiffre valeur={String(enAttente)} libelle={enAttente > 1 ? "personnes en attente" : "personne en attente"} alerte={enAttente > 0} />
      </dl>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <ol className="cascade flex flex-col gap-3">
          {jours.map((jour) => {
            const duJour = plages.filter((p) => p.date === jour);
            const passe = jour < aujourdhui;
            return (
              <li key={jour} className={`rounded-carte bg-white p-4 ${passe ? "opacity-70" : ""}`}>
                <h2 className="flex items-baseline gap-2 font-bold">
                  {majuscule(dateLongue(jour))}
                  {jour === aujourdhui && <span className="rounded-lg bg-marque px-2 py-0.5 text-xs text-white">Aujourd&apos;hui</span>}
                </h2>
                {duJour.length ? (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {duJour.map((p) => (
                      <CartePlage key={p.creneauId} plage={p} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-gris">Pas de plage ce jour-là.</p>
                )}
              </li>
            );
          })}
        </ol>

        <form action={ouvrirPlageAction} className="flex flex-col gap-4 rounded-carte bg-white p-5 lg:sticky lg:top-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icone nom="ph-calendar-plus" className="size-6 text-marque" />
            Ouvrir une plage
          </h2>
          <p className="-mt-2 text-sm text-gris">Un samedi de vaccination, une matinée de rattrapage : les familles la verront tout de suite.</p>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Jour
            <input
              type="date"
              name="date"
              required
              min={aujourdhui}
              max={ajouterJours(aujourdhui, HORIZON_OUVERTURE)}
              defaultValue={ajouterJours(aujourdhui, 1)}
              className="rounded-bouton border-2 border-lavande-3 px-3 py-2 font-normal"
            />
          </label>
          <fieldset className="flex flex-col gap-1 text-sm font-bold">
            <legend>Moment</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["matin", "apres_midi"] as const).map((m, i) => (
                <label key={m} className="cursor-pointer rounded-bouton border-2 border-lavande-3 px-3 py-2 text-center has-checked:border-marque has-checked:bg-lavande-2 has-checked:text-marque">
                  <input type="radio" name="moment" value={m} defaultChecked={i === 0} className="sr-only" />
                  {MOMENTS[m]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Pour
            <select name="motif" required className="rounded-bouton border-2 border-lavande-3 bg-white px-3 py-2 font-normal">
              {MOTIFS_DE_PLAGE.map((m) => (
                <option key={m} value={m}>
                  {LIBELLES_PLAGE[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Nombre de places
            <input type="number" name="capacite" required min={1} max={CAPACITE_MAX} defaultValue={8} className="rounded-bouton border-2 border-lavande-3 px-3 py-2 font-normal" />
          </label>
          <button className="flex items-center justify-center gap-2 rounded-bouton bg-marque py-3 font-bold text-white">
            <Icone nom="ph-plus" className="size-5" />
            Ouvrir la plage
          </button>
        </form>
      </div>
    </>
  );
}

function CartePlage({ plage }: { plage: PlageAgenda }) {
  const complete = plage.prises >= plage.capacite;
  return (
    <li>
      <Link href={`/soignant/agenda/${plage.creneauId}`} className="flex h-full items-start gap-3 rounded-2xl bg-lavande p-3 hover:bg-lavande-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-marque">
          <Icone nom={ICONE_MOTIF[plage.motif]} className="size-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <b className="text-sm leading-tight">{LIBELLES_PLAGE[plage.motif]}</b>
          <small className="text-xs text-gris">
            {MOMENTS[plage.moment]} · {plage.prises} sur {plage.capacite} places
          </small>
          <Places prises={plage.prises} capacite={plage.capacite} />
          {(complete || plage.enAttente > 0) && (
            <span className="mt-0.5 flex flex-wrap gap-1.5 text-xs font-bold">
              {complete && <span className="rounded-lg bg-nuit px-2 py-0.5 text-white">Complet</span>}
              {plage.enAttente > 0 && <span className="rounded-lg bg-soleil-pale px-2 py-0.5 text-nuit">{plage.enAttente} en attente</span>}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
