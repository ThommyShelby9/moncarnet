"use client";

import { useOffline } from "next/offline";
import { CONSEIL_URGENCE } from "@/domain/signes-danger";

/** Ouverture de « J'ai un problème » sans réseau : le conseil d'urgence s'affiche quand même. */
export default function Chargement() {
  const horsLigne = useOffline();
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5">
      {horsLigne ? (
        <section role="alert" className="flex flex-col gap-3 rounded-grande bg-urgence-pale p-5">
          <h1 className="text-xl font-bold text-urgence">Pas de réseau : l&apos;alerte ne peut pas partir</h1>
          <p className="font-bold">{CONSEIL_URGENCE}</p>
        </section>
      ) : (
        <p role="status" className="text-gris">
          Ouverture…
        </p>
      )}
    </main>
  );
}
