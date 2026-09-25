"use client";

import { useActionState } from "react";
import { MOMENTS_PRISE } from "@/domain/temps";
import { Icone } from "@/ui/Icone";
import { ICONE_MOMENT } from "@/ui/pictogrammes";
import { emettreOrdonnanceAction, type EtatFormulaire } from "../../../actions";

const CHAMP = "flex flex-col gap-1.5 text-sm font-bold";
const SAISIE = "h-11 rounded-xl bg-lavande px-3 text-base font-normal";
const MOMENTS = { matin: "Matin", midi: "Midi", soir: "Soir" } as const;
const LIGNES = 3;

export function FormulaireOrdonnance({ patientId }: { patientId: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(emettreOrdonnanceAction, {});
  const valeur = (nom: string, parDefaut = "") => etat.valeurs?.[nom] ?? parDefaut;
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="patientId" value={patientId} />
      {Array.from({ length: LIGNES }, (_, i) => (
        <fieldset key={i} className="grid gap-3 rounded-carte bg-white p-4 sm:grid-cols-2">
          <legend className="sr-only">Médicament {i + 1}</legend>
          <label className={CHAMP}>
            Médicament {i + 1}
            <input name={`lignes.${i}.medicament`} placeholder={i === 0 ? "Amlodipine 5 mg" : "Facultatif"} defaultValue={valeur(`lignes.${i}.medicament`)} className={SAISIE} />
          </label>
          <label className={CHAMP}>
            Pour (en mots simples)
            <input name={`lignes.${i}.indication`} placeholder="la tension" defaultValue={valeur(`lignes.${i}.indication`)} className={SAISIE} />
          </label>
          <div className="grid grid-cols-4 gap-2 sm:col-span-2">
            {MOMENTS_PRISE.map((m) => (
              <label key={m} className={CHAMP}>
                <span className="flex items-center gap-1.5">
                  <Icone nom={ICONE_MOMENT[m]} className="size-5 text-soleil-appuye" />
                  {MOMENTS[m]}
                </span>
                <input name={`lignes.${i}.${m}`} type="number" min={0} max={6} defaultValue={valeur(`lignes.${i}.${m}`, "0")} className={SAISIE} />
              </label>
            ))}
            <label className={CHAMP}>
              Jours
              <input name={`lignes.${i}.dureeJours`} type="number" min={1} max={180} defaultValue={valeur(`lignes.${i}.dureeJours`)} className={SAISIE} />
            </label>
          </div>
          <label className={`${CHAMP} sm:col-span-2`}>
            Conseil
            <input name={`lignes.${i}.conseil`} placeholder="avec un verre d'eau" defaultValue={valeur(`lignes.${i}.conseil`)} className={SAISIE} />
          </label>
        </fieldset>
      ))}
      {etat.message && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="h-12 rounded-bouton bg-marque font-bold text-white disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer l'ordonnance"}
      </button>
    </form>
  );
}
