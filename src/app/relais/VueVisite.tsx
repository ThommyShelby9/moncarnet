"use client";

import { useState } from "react";
import { TENSION_INCOMPLETE } from "@/domain/consultation";
import { CONSTATS_VISITE, LIBELLES_CONSTAT, type ConstatVisite } from "@/domain/evenements";
import { CONSEIL_URGENCE, LIBELLES_SIGNES, signesProposes, type CodeSigne } from "@/domain/signes-danger";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import type { FoyerTournee, PersonneTournee } from "@/domain/tournee";
import type { SaisieEnAttente } from "@/offline/file";
import { saisiesDeVisite } from "@/offline/saisies";
import type { NoteLocale } from "@/offline/stockage";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { ICONE_SIGNE } from "@/ui/pictogrammes";
import { Enregistreur } from "./Enregistreur";

const ICONE_CONSTAT: Record<ConstatVisite, NomIcone> = { tout_va_bien: "ph-check-circle", a_orienter: "hi-hospital", absent: "ph-house" };
const TENSION_INVALIDE = "Vérifiez la tension : par exemple 140 sur 90.";
const PASTILLE = ["bg-urgence", "bg-soleil", "bg-lavande-5"] as const;

/** Tension facultative : les deux chiffres ou aucun. « 14 sur 9 », comme on le dit souvent, se lit 140/90. */
export function lireTension(sys: string, dia: string): { sys: number; dia: number } | null | string {
  if (!sys.trim() && !dia.trim()) return null;
  if (!sys.trim() || !dia.trim()) return TENSION_INCOMPLETE;
  let s = Number(sys);
  let d = Number(dia);
  if (!Number.isInteger(s) || !Number.isInteger(d)) return TENSION_INVALIDE;
  if (s <= 30 && d <= 20) {
    s *= 10;
    d *= 10;
  }
  if (s < 50 || s > 300 || d < 30 || d > 200) return TENSION_INVALIDE;
  return { sys: s, dia: d };
}

type Props = {
  personne: PersonneTournee;
  foyer: Pick<FoyerTournee, "nom" | "village">;
  onRetour: () => void;
  onEnregistrer: (saisies: SaisieEnAttente[], note: NoteLocale | null) => void;
};

export function VueVisite({ personne, foyer, onRetour, onEnregistrer }: Props) {
  const [constat, setConstat] = useState<ConstatVisite | null>(null);
  const [note, setNote] = useState<NoteLocale | null>(null);
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [danger, setDanger] = useState(false);
  const [signes, setSignes] = useState<CodeSigne[]>([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const telephone = personne.telephone ? normaliserTelephone(personne.telephone) : null;

  function enregistrer() {
    if (!constat) return;
    const tension = lireTension(sys, dia);
    if (typeof tension === "string") {
      setErreur(tension);
      return;
    }
    const saisies = saisiesDeVisite(
      { personne, constat, texte: texte.trim() || undefined, tension: tension ?? undefined, signes: danger ? signes : [], avecNote: note !== null },
      new Date(),
    );
    onEnregistrer(saisies, note);
  }

  return (
    <main className="cascade mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-lavande px-4 py-5">
      <button type="button" onClick={onRetour} className="flex items-center gap-2 self-start rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-5" />
        Ma tournée
      </button>
      <header>
        <p className="text-sm font-bold text-gris">
          Foyer {foyer.nom}, {foyer.village}
        </p>
        <h1 className="text-2xl font-bold">
          Visite chez {personne.prenom} {personne.nom}
        </h1>
        <p className="text-gris">
          {personne.libelleAge}
          {telephone ? ` · ${formaterTelephone(telephone)}` : ""}
        </p>
      </header>

      {personne.raisons.length > 0 && (
        <section aria-labelledby="titre-raisons" className="rounded-carte bg-white p-4">
          <h2 id="titre-raisons" className="text-sm font-bold text-gris">
            Pourquoi passer
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {personne.raisons.map((r) => (
              <li key={r.texte} className="flex items-start gap-2">
                <span aria-hidden="true" className={`mt-2 size-2.5 shrink-0 rounded-full ${PASTILLE[r.urgence]}`} />
                {r.texte}
              </li>
            ))}
          </ul>
        </section>
      )}

      <fieldset>
        <legend className="mb-2 font-bold">Comment ça va ?</legend>
        <div className="grid grid-cols-3 gap-2">
          {CONSTATS_VISITE.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-carte bg-white p-3 text-center text-sm font-bold has-checked:bg-marque has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-soleil-appuye"
            >
              <input type="radio" name="constat" value={c} checked={constat === c} onChange={() => setConstat(c)} className="sr-only" />
              <Icone nom={ICONE_CONSTAT[c]} className="size-8" />
              {LIBELLES_CONSTAT[c]}
            </label>
          ))}
        </div>
      </fieldset>

      <Enregistreur note={note} onNote={setNote} />

      <fieldset className="rounded-carte bg-white p-4">
        <legend className="float-left flex items-center gap-2 font-bold">
          <Icone nom="hi-blood-pressure" className="size-6 text-marque" />
          Tension <span className="text-sm font-normal text-gris">(facultatif)</span>
        </legend>
        <div className="clear-left flex items-center gap-2 pt-2">
          <input
            aria-label="Tension, premier chiffre"
            inputMode="numeric"
            value={sys}
            onChange={(e) => setSys(e.target.value)}
            placeholder="140"
            className="w-20 rounded-bouton bg-lavande px-3 py-2.5 text-center text-lg font-bold"
          />
          <span className="font-bold">sur</span>
          <input
            aria-label="Tension, second chiffre"
            inputMode="numeric"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            placeholder="90"
            className="w-20 rounded-bouton bg-lavande px-3 py-2.5 text-center text-lg font-bold"
          />
        </div>
      </fieldset>

      <section className="rounded-carte bg-white p-4">
        <label className="flex items-center gap-3 font-bold">
          <input type="checkbox" checked={danger} onChange={(e) => setDanger(e.target.checked)} className="size-5 accent-urgence" />
          <Icone nom="hi-alert-circle" className="size-6 text-urgence" />
          Signe de danger
        </label>
        {danger && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {signesProposes(personne).map((code) => (
                <label
                  key={code}
                  className="flex cursor-pointer items-center gap-2 rounded-bouton bg-lavande p-2.5 text-sm font-bold has-checked:bg-urgence has-checked:text-white"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={signes.includes(code)}
                    onChange={(e) => setSignes((s) => (e.target.checked ? [...s, code] : s.filter((x) => x !== code)))}
                  />
                  <Icone nom={ICONE_SIGNE[code]} className="size-6 shrink-0" />
                  {LIBELLES_SIGNES[code]}
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-bouton bg-urgence-pale p-3 text-sm font-bold text-urgence">
              {CONSEIL_URGENCE} L&apos;alerte part au centre dès que le réseau le permet.
            </p>
          </>
        )}
      </section>

      <label className="flex flex-col gap-1.5 font-bold">
        <span>
          Un mot pour le centre <span className="text-sm font-normal text-gris">(facultatif)</span>
        </span>
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={500} rows={2} className="rounded-bouton bg-white p-3 font-normal" />
      </label>

      {erreur && (
        <p role="alert" className="rounded-bouton bg-urgence-pale p-3 font-bold text-urgence">
          {erreur}
        </p>
      )}
      <button
        type="button"
        onClick={enregistrer}
        disabled={!constat || (danger && signes.length === 0)}
        className="sticky bottom-4 rounded-bouton bg-marque py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        Enregistrer la visite
      </button>
    </main>
  );
}
