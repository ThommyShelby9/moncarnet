"use client";

import { useState, type FormEvent } from "react";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { LIBELLES_INSCRIPTION, lireInscription, TYPES_INSCRIPTION, type TypeInscription } from "@/domain/inscription";
import type { FoyerTournee } from "@/domain/tournee";
import type { SaisieEnAttente } from "@/offline/file";
import { saisieDInscription } from "@/offline/saisies";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";

const ICONE_INSCRIPTION: Record<TypeInscription, NomIcone> = {
  nouveau_ne: "hi-baby-0306m",
  grossesse: "hi-pregnant",
  tension: "hi-blood-pressure",
  diabete: "hi-diabetes-measure",
  personne_agee: "hi-elderly",
};
const CHAMP = "rounded-bouton bg-white px-3 py-3 text-lg";
const TUILE = "flex cursor-pointer items-center justify-center gap-2 rounded-bouton bg-white p-3 font-bold has-checked:bg-marque has-checked:text-white";

type Props = {
  foyers: Pick<FoyerTournee, "id" | "nom" | "village">[];
  foyerId: string | null;
  onRetour: () => void;
  onInscrire: (saisie: SaisieEnAttente) => void;
};

/** Inscrire une personne pendant la tournée, même sans réseau : son carnet sera créé au retour du réseau. */
export function VueInscription({ foyers, foyerId, onRetour, onInscrire }: Props) {
  const [type, setType] = useState<TypeInscription | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const nouveauNe = type === "nouveau_ne";

  function inscrire(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const champs = Object.fromEntries([...new FormData(e.currentTarget).entries()].filter(([, v]) => v !== "").map(([cle, v]) => [cle, String(v)]));
    const lecture = lireInscription({ ...champs, type }, aujourdhuiAuBenin());
    if (!lecture.ok) {
      setErreur(lecture.message);
      return;
    }
    onInscrire(saisieDInscription(lecture.donnees, new Date()));
  }

  return (
    <main className="cascade mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-lavande px-4 py-5">
      <button type="button" onClick={onRetour} className="flex items-center gap-2 self-start rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-5" />
        Ma tournée
      </button>
      <h1 className="text-2xl font-bold">Inscrire une personne</h1>
      <form onSubmit={inscrire} className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 font-bold">Pour quoi ?</legend>
          <div className="grid grid-cols-2 gap-2">
            {TYPES_INSCRIPTION.map((t) => (
              <label key={t} className={`${TUILE} flex-col py-4`}>
                <input type="radio" name="typeChoisi" checked={type === t} onChange={() => setType(t)} className="sr-only" />
                <Icone nom={ICONE_INSCRIPTION[t]} className="size-9" />
                {LIBELLES_INSCRIPTION[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 font-bold">
          Foyer
          <select name="foyerId" defaultValue={foyerId ?? foyers[0]?.id} className={CHAMP}>
            {foyers.map((f) => (
              <option key={f.id} value={f.id}>
                Foyer {f.nom}, {f.village}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 font-bold">
          Prénom
          <input name="prenom" autoComplete="off" className={CHAMP} />
        </label>
        <label className="flex flex-col gap-1.5 font-bold">
          Nom
          <input name="nom" autoComplete="off" className={CHAMP} />
        </label>

        {type === "grossesse" ? (
          <input type="hidden" name="sexe" value="F" />
        ) : (
          <fieldset>
            <legend className="mb-2 font-bold">Sexe</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={TUILE}>
                <input type="radio" name="sexe" value="F" className="sr-only" />
                {nouveauNe ? "Fille" : "Femme"}
              </label>
              <label className={TUILE}>
                <input type="radio" name="sexe" value="M" className="sr-only" />
                {nouveauNe ? "Garçon" : "Homme"}
              </label>
            </div>
          </fieldset>
        )}

        {nouveauNe ? (
          <label className="flex flex-col gap-1.5 font-bold">
            Né le
            <input type="date" name="nele" max={aujourdhuiAuBenin()} className={CHAMP} />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 font-bold">
            Âge (en années)
            <input name="age" inputMode="numeric" className={CHAMP} />
          </label>
        )}
        {type === "grossesse" && (
          <label className="flex flex-col gap-1.5 font-bold">
            Semaines de grossesse
            <input name="semaines" inputMode="numeric" className={CHAMP} />
          </label>
        )}
        <label className="flex flex-col gap-1.5 font-bold">
          <span>
            Téléphone <span className="text-sm font-normal text-gris">(facultatif)</span>
          </span>
          <input name="telephone" inputMode="tel" autoComplete="off" className={CHAMP} />
        </label>

        {erreur && (
          <p role="alert" className="rounded-bouton bg-urgence-pale p-3 font-bold text-urgence">
            {erreur}
          </p>
        )}
        <button disabled={!type} className="rounded-bouton bg-marque py-4 text-lg font-bold text-white disabled:opacity-50">
          Inscrire
        </button>
      </form>
    </main>
  );
}
