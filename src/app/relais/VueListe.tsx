"use client";

import { heureMinute } from "@/domain/temps";
import {
  avancement,
  type FoyerTournee,
  type PersonneTournee,
  type Tournee,
} from "@/domain/tournee";
import { iconePourPersonne } from "@/ui/avatar";
import { BoutonDeconnexion } from "@/ui/BoutonDeconnexion";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { RetourAction } from "@/ui/RetourAction";

type Props = {
  relais: string;
  tournee: Tournee | null;
  /** Le stockage du téléphone a été lu (évite d'annoncer « pas de tournée » avant la lecture). */
  pret: boolean;
  enAttente: string | null;
  aCorriger: number;
  horsLigne: boolean;
  preparation: boolean;
  message: string | null;
  retour: string | null;
  onPreparer: () => void;
  onVisiter: (personneId: string) => void;
  onInscrire: () => void;
  onEnvoi: () => void;
  avantDeconnexion: () => Promise<string | null>;
};

const estAVoir = (f: FoyerTournee) =>
  f.urgence !== null || f.personnes.some((p) => p.vueAujourdhui);

export function VueListe(p: Props) {
  const { faits, aVoir } = p.tournee
    ? avancement(p.tournee.foyers)
    : { faits: 0, aVoir: 0 };
  const foyersAVoir = p.tournee?.foyers.filter(estAVoir) ?? [];
  const autresFoyers = p.tournee?.foyers.filter((f) => !estAVoir(f)) ?? [];
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col bg-lavande">
      <header className="relative overflow-hidden rounded-b-grande bg-nuit px-4 pt-5 pb-5 text-white">
        <Ondes className="-top-12 -right-12 size-52 text-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
            <Icone nom="hi-community-healthworker" className="size-9" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">Ma tournée</h1>
            <p className="truncate text-sm text-lavande-4">
              {p.relais}
              {p.tournee
                ? ` · ${p.tournee.foyers.length} foyer${p.tournee.foyers.length > 1 ? "s" : ""} suivi${p.tournee.foyers.length > 1 ? "s" : ""}`
                : ""}
            </p>
          </div>
          <BoutonDeconnexion
            compact
            className="grid size-11 place-items-center rounded-bouton bg-white/10 text-white"
            avantDeconnexion={p.avantDeconnexion}
          />
        </div>
        {(p.enAttente || p.horsLigne) && (
          <p
            role="status"
            className="relative mt-4 flex items-center gap-2 rounded-bouton bg-soleil/15 px-3 py-2 text-sm font-bold text-soleil-pale"
          >
            <Icone
              nom={p.enAttente ? "ph-cloud-arrow-up" : "ph-wifi-slash"}
              className="size-5 shrink-0 text-soleil"
            />
            {p.enAttente ??
              "Pas de réseau : vos saisies restent sur le téléphone."}
          </p>
        )}
      </header>

      <div className="cascade flex flex-1 flex-col gap-3 px-4 py-4">
        {p.retour && <RetourAction message={p.retour} />}
        {p.message && (
          <p
            role="alert"
            className="rounded-bouton bg-soleil-pale px-4 py-3 text-sm font-bold"
          >
            {p.message}
          </p>
        )}
        {p.aCorriger > 0 && (
          <button
            type="button"
            onClick={p.onEnvoi}
            className="flex items-center gap-2 rounded-bouton bg-urgence-pale px-4 py-3 text-left text-sm font-bold text-urgence"
          >
            <Icone nom="ph-warning-circle" className="size-5 shrink-0" />
            {p.aCorriger === 1
              ? "1 saisie à corriger"
              : `${p.aCorriger} saisies à corriger`}
          </button>
        )}

        {p.tournee ? (
          <>
            <div className="flex items-center gap-3 text-sm font-bold">
              <span>
                {faits} foyer{faits > 1 ? "s" : ""} sur {aVoir}
              </span>
              <span
                role="progressbar"
                aria-label="Foyers visités aujourd'hui"
                aria-valuemin={0}
                aria-valuemax={aVoir}
                aria-valuenow={faits}
                className="h-2 flex-1 overflow-hidden rounded bg-lavande-3"
              >
                <span
                  className="block h-full origin-left animate-remplir rounded bg-marque"
                  style={{ width: aVoir ? `${(faits / aVoir) * 100}%` : "0%" }}
                />
              </span>
            </div>
            <ul className="cascade flex flex-col gap-3">
              {foyersAVoir.map((foyer) => (
                <CarteFoyer
                  key={foyer.id}
                  foyer={foyer}
                  onVisiter={p.onVisiter}
                  replier
                />
              ))}
            </ul>
            {autresFoyers.length > 0 && (
              <details className="group rounded-carte bg-white/60 p-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-1 font-bold text-marque">
                  <Icone
                    nom="ph-caret-right"
                    className="size-5 transition-transform group-open:rotate-90"
                  />
                  Autres foyers ({autresFoyers.length})
                  <span className="ml-auto text-xs font-normal text-gris">
                    rien de particulier
                  </span>
                </summary>
                <ul className="mt-3 flex flex-col gap-3">
                  {autresFoyers.map((foyer) => (
                    <CarteFoyer
                      key={foyer.id}
                      foyer={foyer}
                      onVisiter={p.onVisiter}
                      replier={false}
                    />
                  ))}
                </ul>
              </details>
            )}
            <p className="text-center text-xs text-gris">
              Tournée préparée à {heureMinute(new Date(p.tournee.prepareeLe))}
            </p>
          </>
        ) : p.pret ? (
          <section className="flex flex-col gap-2 rounded-carte bg-white p-5">
            <h2 className="text-lg font-bold">Préparez votre tournée</h2>
            <p className="text-gris">
              Avec du réseau, copiez vos foyers sur ce téléphone : ils resteront
              lisibles pendant toute la tournée, même sans réseau.
            </p>
          </section>
        ) : null}

        <button
          type="button"
          onClick={p.onPreparer}
          disabled={p.preparation || p.horsLigne}
          className="flex items-center justify-center gap-2 rounded-bouton bg-white py-3 font-bold text-marque disabled:opacity-60"
        >
          <Icone nom="ph-arrow-counter-clockwise" className="size-5" />
          {p.preparation
            ? "Préparation…"
            : p.tournee
              ? "Mettre à jour ma tournée"
              : "Préparer ma tournée"}
        </button>
      </div>

      <nav
        aria-label="Actions de la tournée"
        className="sticky bottom-0 grid grid-cols-2 gap-3 rounded-t-grande bg-white px-4 pt-3 pb-5"
      >
        <button
          type="button"
          onClick={p.onInscrire}
          disabled={!p.tournee}
          className="flex items-center gap-2 rounded-bouton bg-soleil px-3 py-3 text-left font-bold text-nuit disabled:opacity-60"
        >
          <Icone nom="ph-plus" className="size-6 shrink-0" />
          Inscrire une personne
        </button>
        <button
          type="button"
          onClick={p.onEnvoi}
          className="flex items-center gap-2 rounded-bouton bg-lavande-2 px-3 py-3 text-left font-bold text-marque"
        >
          <Icone nom="ph-cloud-arrow-up" className="size-6 shrink-0" />
          Envois
        </button>
      </nav>
    </main>
  );
}

/** Carte d'un foyer : les personnes à voir d'abord ; les autres, repliées, restent à un geste. */
function CarteFoyer({
  foyer,
  onVisiter,
  replier,
}: {
  foyer: FoyerTournee;
  onVisiter: (personneId: string) => void;
  replier: boolean;
}) {
  const vu = foyer.personnes.some((p) => p.vueAujourdhui);
  const aMontrer = (p: PersonneTournee) =>
    !replier || p.raisons.length > 0 || p.vueAujourdhui;
  const visibles = foyer.personnes.filter(aMontrer);
  const repliees = foyer.personnes.filter((p) => !aMontrer(p));
  return (
    <li className="rounded-carte bg-white p-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="font-bold">Foyer {foyer.nom}</h2>
        {vu && (
          <Icone
            nom="ph-check-circle"
            className="size-5 text-marque"
            titre="Visité aujourd'hui"
          />
        )}
        {foyer.urgence === 0 && (
          <span className="rounded-lg bg-urgence px-2 py-0.5 text-xs font-bold text-white">
            Urgent
          </span>
        )}
        <span className="ml-auto text-xs text-gris">{foyer.village}</span>
      </div>
      <ListePersonnes personnes={visibles} onVisiter={onVisiter} />
      {repliees.length > 0 && (
        <details className="group mt-1">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-1.5 py-1 text-sm font-bold text-marque">
            <Icone
              nom="ph-caret-right"
              className="size-4 transition-transform group-open:rotate-90"
            />
            {repliees.length === 1
              ? "1 autre personne"
              : `${repliees.length} autres personnes`}
          </summary>
          <ListePersonnes personnes={repliees} onVisiter={onVisiter} />
        </details>
      )}
    </li>
  );
}

function ListePersonnes({
  personnes,
  onVisiter,
}: {
  personnes: PersonneTournee[];
  onVisiter: (personneId: string) => void;
}) {
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {personnes.map((personne) => (
        <li key={personne.id}>
          <button
            type="button"
            onClick={() => onVisiter(personne.id)}
            className="flex w-full items-center gap-3 rounded-2xl p-1.5 text-left hover:bg-lavande focus-visible:outline-3 focus-visible:outline-soleil-appuye"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
              <Icone
                nom={
                  personne.enceinte
                    ? "hi-pregnant"
                    : iconePourPersonne(personne.sexe, personne.age)
                }
                className="size-7"
              />
            </span>
            <span className="min-w-0 flex-1">
              <b className="flex flex-wrap items-center gap-1.5 text-sm">
                {personne.prenom}, {personne.libelleAge}
                {personne.malvoyant && (
                  <span className="rounded-lg bg-lavande-2 px-1.5 text-xs text-gris">
                    {personne.sexe === "F" ? "Malvoyante" : "Malvoyant"}
                  </span>
                )}
              </b>
              <small className="block text-xs leading-snug text-gris">
                {personne.raisons.length
                  ? personne.raisons
                      .slice(0, 2)
                      .map((r) => r.texte)
                      .join(" · ")
                  : personne.vueAujourdhui
                    ? "Visite notée aujourd'hui"
                    : "Rien de particulier"}
              </small>
            </span>
            <Icone
              nom={
                personne.vueAujourdhui ? "ph-check-circle" : "ph-caret-right"
              }
              className="size-5 shrink-0 text-marque"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
