"use client";

import { useEffect } from "react";
import type { Place } from "@/domain/salle-attente";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { arriverAction } from "../actions";

const personnesAvant = (n: number, prenom: string | null) => {
  const qui = prenom ?? "vous";
  return n === 0 ? `Plus personne avant ${qui}` : n === 1 ? `1 personne avant ${qui}` : `${n} personnes avant ${qui}`;
};

/** La salle d'attente dans le téléphone : dire qu'on est arrivé, puis suivre son tour sans rester collé à la porte (spec §4.4). */
export function CarteSalleAttente({ patientId, prenom, place }: { patientId: string; prenom: string | null; place: Place | null }) {
  const tour = place?.etat === "appele";
  const bientot = place?.etat === "attente" && place.bientot;
  useEffect(() => {
    if (tour || bientot) navigator.vibrate?.([120, 80, 120]);
  }, [tour, bientot]);

  if (!place) {
    return (
      <form action={arriverAction} className="flex flex-col gap-3 rounded-carte bg-white p-4">
        <input type="hidden" name="patientId" value={patientId} />
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lavande-2 text-marque">
            <Icone nom="hi-hospital" className="size-8" />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block leading-snug">{prenom ? `Au centre avec ${prenom} ?` : "Vous êtes au centre de santé ?"}</b>
            <small className="text-sm text-gris">Prenez un numéro : le téléphone vous dira quand c&apos;est votre tour.</small>
          </div>
        </div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-bouton bg-marque font-bold text-white">
          <Icone nom="ph-map-pin" className="size-5" />
          Je suis arrivé au centre
        </button>
      </form>
    );
  }

  if (place.etat === "appele") {
    return (
      <section className="relative overflow-hidden rounded-grande bg-marque p-5 text-white">
        <Ondes className="-top-10 -right-12 size-52 text-white opacity-10" />
        <p role="status" className="relative text-2xl leading-tight font-bold">
          {prenom ? `C'est le tour de ${prenom} : entrez en consultation` : "C'est votre tour : entrez en consultation"}
        </p>
        <p className="relative mt-2 text-lavande-3">Numéro {place.numero}</p>
      </section>
    );
  }

  return (
    <section className={`flex items-center gap-4 rounded-grande p-5 ${bientot ? "bg-soleil text-nuit" : "bg-white"}`}>
      <div className={`grid size-20 shrink-0 place-items-center rounded-2xl ${bientot ? "animate-battement bg-white/60" : "bg-lavande-2 text-marque"}`}>
        <span className="text-center">
          <small className="block text-xs font-bold">N°</small>
          <b className="block animate-surgir text-3xl leading-none tabular-nums" style={{ animationDelay: "300ms" }}>
            {place.numero}
          </b>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <small className="text-sm font-bold">{prenom ? `Salle d'attente, pour ${prenom}` : "Salle d'attente"}</small>
        {bientot ? (
          <p role="status" className="text-xl leading-tight font-bold">
            {prenom ? `C'est bientôt le tour de ${prenom}` : "C'est bientôt votre tour"}
          </p>
        ) : null}
        <p className={bientot ? "font-bold" : "text-xl leading-tight font-bold"}>{personnesAvant(place.avant, prenom)}</p>
        {!bientot && <small className="text-sm text-gris">Restez près du centre : le téléphone vous prévient.</small>}
      </div>
    </section>
  );
}
