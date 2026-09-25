"use client";

import { useOffline } from "next/offline";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Bouton d'envoi : dit « en cours », et sans réseau, que l'envoi partira au retour du réseau. */
export function BoutonEnvoi({ children, enCours, horsLigne, className = "" }: { children: ReactNode; enCours: string; horsLigne: string; className?: string }) {
  const { pending } = useFormStatus();
  const sansReseau = useOffline();
  return (
    <>
      <button disabled={pending} className={className}>
        {pending ? enCours : children}
      </button>
      {pending && sansReseau && (
        <p role="status" className="rounded-bouton bg-nuit px-4 py-3 text-sm font-bold text-white">
          {horsLigne}
        </p>
      )}
    </>
  );
}
