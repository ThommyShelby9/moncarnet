"use client";

import { useState } from "react";
import { Icone } from "./Icone";

type Props = { name: string; libelle: string; longueur?: number; onComplet?: (code: string) => void };

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function PaveNumerique({ name, libelle, longueur = 4, onComplet }: Props) {
  const [code, setCode] = useState("");

  function taper(chiffre: string) {
    if (code.length >= longueur) return;
    const suivant = code + chiffre;
    setCode(suivant);
    if (suivant.length === longueur) onComplet?.(suivant);
  }

  const touche = "h-16 rounded-bouton bg-white text-2xl font-bold text-nuit active:bg-lavande-2";

  return (
    <fieldset className="flex flex-col">
      <legend className="mb-3 font-bold">{libelle}</legend>
      <input type="hidden" name={name} value={code} />
      <div
        role="status"
        aria-live="polite"
        aria-label={`${code.length} chiffre${code.length > 1 ? "s" : ""} sur ${longueur}`}
        className="mb-4 flex justify-center gap-3"
      >
        {Array.from({ length: longueur }, (_, i) => (
          <span key={i} className={`size-4 rounded-full ${i < code.length ? "bg-marque" : "bg-lavande-3"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TOUCHES.map((c) => (
          <button key={c} type="button" className={touche} onClick={() => taper(c)}>
            {c}
          </button>
        ))}
        <button
          type="button"
          aria-label="Effacer le dernier chiffre"
          className="grid h-16 place-items-center rounded-bouton bg-lavande-2 text-marque"
          onClick={() => setCode((c) => c.slice(0, -1))}
        >
          <Icone nom="ph-backspace" className="size-7" />
        </button>
        <button type="button" className={touche} onClick={() => taper("0")}>
          0
        </button>
        <span aria-hidden="true" />
      </div>
    </fieldset>
  );
}
