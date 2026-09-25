"use client";

import { useActionState } from "react";
import { PaveNumerique } from "@/ui/PaveNumerique";
import { connecterPatient } from "./actions";

export function FormulairePatient() {
  const [etat, action, enCours] = useActionState(connecterPatient, {});
  return (
    <form action={action} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2 font-bold">
        Mon numéro de téléphone
        <input
          name="telephone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="01 97 12 34 56"
          required
          className="h-14 rounded-bouton bg-white px-4 text-xl font-normal tracking-wide"
        />
      </label>
      <PaveNumerique name="code" libelle="Mon code secret à 4 chiffres" />
      {etat.message && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="h-14 rounded-bouton bg-marque text-lg font-bold text-white disabled:opacity-60">
        {enCours ? "Ouverture…" : "Ouvrir mon carnet"}
      </button>
    </form>
  );
}
