"use client";

import { useEffect, useState } from "react";
import { DELAI_PRISE_EN_CHARGE_MINUTES, minutesRestantes } from "@/domain/alertes";

const RAYON = 25;
const TOUR = 2 * Math.PI * RAYON;

/** Compte à rebours d'une alerte : les minutes qui restent pour rappeler, puis le retard. */
export function CompteARebours({ echeance, maintenant: maintenantServeur }: { echeance: string; maintenant: string }) {
  const [maintenant, setMaintenant] = useState(() => new Date(maintenantServeur).getTime());
  useEffect(() => {
    const tic = () => setMaintenant(Date.now());
    const premier = setTimeout(tic, 0);
    const minuteur = setInterval(tic, 15_000);
    return () => {
      clearTimeout(premier);
      clearInterval(minuteur);
    };
  }, []);
  const restantes = minutesRestantes(new Date(echeance), new Date(maintenant));
  const enRetard = restantes <= 0;
  const part = Math.min(Math.max(restantes / DELAI_PRISE_EN_CHARGE_MINUTES, 0), 1);
  return (
    <div
      role="timer"
      aria-label={enRetard ? `Délai dépassé de ${-restantes} minutes` : `Reste ${restantes} minutes`}
      className={`relative size-[58px] shrink-0 text-urgence ${restantes <= 5 ? "animate-battement" : ""}`}
    >
      <svg viewBox="0 0 58 58" className="size-[58px] -rotate-90" aria-hidden="true">
        <circle cx="29" cy="29" r={RAYON} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="5" />
        <circle cx="29" cy="29" r={RAYON} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${part * TOUR} ${TOUR}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center leading-none font-bold">
        {enRetard ? <small className="text-[0.55rem]">retard</small> : null}
        <span className="text-lg tabular-nums">{Math.abs(restantes)}</span>
        <small className="text-[0.58rem] font-normal">min</small>
      </span>
    </div>
  );
}
