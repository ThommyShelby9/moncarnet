"use client";

import { useActionState } from "react";
import { connecterPersonnel } from "./actions";

const champ = "h-14 rounded-bouton bg-white px-4 text-lg font-normal";

export function FormulairePersonnel() {
  const [etat, action, enCours] = useActionState(connecterPersonnel, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 font-bold">
        Identifiant
        <input name="identifiant" autoComplete="username" required className={champ} />
      </label>
      <label className="flex flex-col gap-2 font-bold">
        Mot de passe
        <input name="motDePasse" type="password" autoComplete="current-password" required className={champ} />
      </label>
      {etat.message && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="h-14 rounded-bouton bg-marque text-lg font-bold text-white disabled:opacity-60">
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
