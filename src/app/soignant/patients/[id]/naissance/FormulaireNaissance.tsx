"use client";

import { useActionState } from "react";
import { LIBELLES_LIEU, LIBELLES_MODE, LIEUX_NAISSANCE, MODES_NAISSANCE } from "@/domain/naissance";
import { declarerNaissanceAction, type EtatFormulaire } from "../../../actions";

const CHAMP = "flex flex-col gap-1.5 text-sm font-bold";
const SAISIE = "h-11 rounded-xl bg-lavande px-3 text-base font-normal";
const TUILE = "flex cursor-pointer items-center justify-center rounded-xl bg-lavande px-3 py-2.5 text-sm font-bold has-checked:bg-marque has-checked:text-white";

export function FormulaireNaissance({ mereId, date, heure }: { mereId: string; date: string; heure: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(declarerNaissanceAction, {});
  const valeur = (nom: string, defaut = "") => etat.valeurs?.[nom] ?? defaut;
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5 rounded-carte bg-white p-5">
      <input type="hidden" name="mereId" value={mereId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={CHAMP}>
          Date
          <input type="date" name="date" defaultValue={valeur("date", date)} max={date} className={SAISIE} />
        </label>
        <label className={CHAMP}>
          Heure
          <input type="time" name="heure" defaultValue={valeur("heure", heure)} className={SAISIE} />
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-bold">Lieu</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LIEUX_NAISSANCE.map((l) => (
            <label key={l} className={TUILE}>
              <input type="radio" name="lieu" value={l} defaultChecked={valeur("lieu", "centre") === l} className="sr-only" />
              {LIBELLES_LIEU[l]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-bold">Accouchement</legend>
          <div className="grid grid-cols-2 gap-2">
            {MODES_NAISSANCE.map((m) => (
              <label key={m} className={TUILE}>
                <input type="radio" name="mode" value={m} defaultChecked={valeur("mode", "voie_basse") === m} className="sr-only" />
                {LIBELLES_MODE[m]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-bold">Le bébé</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className={TUILE}>
              <input type="radio" name="sexe" value="F" defaultChecked={valeur("sexe") === "F"} className="sr-only" />
              Fille
            </label>
            <label className={TUILE}>
              <input type="radio" name="sexe" value="M" defaultChecked={valeur("sexe") === "M"} className="sr-only" />
              Garçon
            </label>
          </div>
        </fieldset>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={CHAMP}>
          Poids (kg)
          <input name="poids" inputMode="decimal" placeholder="3,2" defaultValue={valeur("poids")} className={SAISIE} />
        </label>
        <label className={CHAMP}>
          <span>
            Prénom <span className="font-normal text-gris">(facultatif : « Bébé » en attendant)</span>
          </span>
          <input name="prenom" autoComplete="off" defaultValue={valeur("prenom")} className={SAISIE} />
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm font-bold">
        <input type="checkbox" name="vaccins" defaultChecked={valeur("vaccins", "on") === "on"} className="size-5 accent-marque" />
        Vaccins de naissance faits (BCG, polio 0)
      </label>
      {etat.message && (
        <p role="alert" className="rounded-xl bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="self-start rounded-bouton bg-marque px-6 py-3 font-bold text-white disabled:opacity-60">
        Enregistrer la naissance
      </button>
    </form>
  );
}
