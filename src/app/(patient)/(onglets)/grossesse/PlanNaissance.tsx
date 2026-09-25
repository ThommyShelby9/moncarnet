"use client";

import { useState, useTransition } from "react";
import { ELEMENTS_PLAN, type CodePlan } from "@/domain/grossesse";
import { Icone } from "@/ui/Icone";
import { ICONE_PLAN } from "@/ui/pictogrammes";
import { planNaissanceAction } from "../../actions";

/** Plan d'accouchement : ce qui est prêt se coche d'un geste et se garde tout de suite. */
export function PlanNaissance({ patientId, coches }: { patientId: string; coches: CodePlan[] }) {
  const [elements, setElements] = useState<CodePlan[]>(coches);
  const [erreur, setErreur] = useState(false);
  const [, demarrer] = useTransition();

  function basculer(code: CodePlan) {
    const suivant = elements.includes(code) ? elements.filter((c) => c !== code) : [...elements, code];
    setElements(suivant);
    demarrer(async () => {
      const resultat = await planNaissanceAction(patientId, suivant);
      setErreur(!resultat.ok);
    });
  }

  return (
    <section aria-labelledby="titre-plan" className="flex flex-col gap-3 rounded-carte bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titre-plan" className="text-lg font-bold">
          Préparer la naissance
        </h2>
        <span className="rounded-lg bg-soleil-pale px-2.5 py-1 text-sm font-bold text-nuit">
          {elements.length} sur {ELEMENTS_PLAN.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {ELEMENTS_PLAN.map((e) => {
          const fait = elements.includes(e.code);
          return (
            <li key={e.code}>
              <button
                type="button"
                role="checkbox"
                aria-checked={fait}
                onClick={() => basculer(e.code)}
                className="flex w-full items-center gap-3 rounded-2xl bg-lavande p-3 text-left focus-visible:outline-3 focus-visible:outline-soleil-appuye"
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${fait ? "bg-marque text-white" : "bg-white text-marque"}`}>
                  <Icone nom={ICONE_PLAN[e.code]} className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block leading-snug">{e.libelle}</b>
                  <small className="text-sm text-gris">{e.detail}</small>
                </span>
                {fait ? (
                  <Icone nom="ph-check-circle" className="size-7 shrink-0 text-marque" />
                ) : (
                  <span aria-hidden="true" className="size-6 shrink-0 rounded-full border-2 border-lavande-4" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {erreur && (
        <p role="alert" className="rounded-bouton bg-soleil-pale px-3 py-2 text-sm font-bold">
          Pas encore enregistré : ce sera fait quand le réseau reviendra.
        </p>
      )}
    </section>
  );
}
