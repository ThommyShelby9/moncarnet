"use client";

import { useState, useTransition } from "react";
import { seDeconnecter } from "@/app/actions-session";
import { Icone } from "./Icone";

/** Pages gardées par le service worker (`public/sw.js`) pour être lues sans réseau. */
export const CACHE_PAGES = "mc-pages";

type Props = {
  className?: string;
  conteneur?: string;
  /** Pictogramme seul : « Se déconnecter » devient le nom accessible. */
  compact?: boolean;
  /** Renvoie un message si la déconnexion doit attendre (saisies pas encore parties), sinon efface ce qui doit l'être. */
  avantDeconnexion?: () => Promise<string | null>;
};

/** Le téléphone peut être partagé : se déconnecter efface les pages gardées pour marcher sans réseau (spec §10.4). */
export function BoutonDeconnexion({
  className = "flex items-center gap-2 rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque",
  conteneur = "flex flex-col items-end gap-2",
  compact = false,
  avantDeconnexion,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function deconnecter() {
    demarrer(async () => {
      const attente = avantDeconnexion ? await avantDeconnexion() : null;
      if (attente) {
        setMessage(attente);
        return;
      }
      if ("caches" in window) await caches.delete(CACHE_PAGES);
      await seDeconnecter();
    });
  }

  return (
    <div className={conteneur}>
      <button
        type="button"
        onClick={deconnecter}
        disabled={enCours}
        aria-label={compact ? "Se déconnecter" : undefined}
        title={compact ? "Se déconnecter" : undefined}
        className={className}
      >
        <Icone nom="ph-sign-out" className="size-5" />
        {compact ? null : "Se déconnecter"}
      </button>
      {message && (
        <p role="alert" className="max-w-xs rounded-bouton bg-soleil-pale px-3 py-2 text-sm font-bold text-nuit">
          {message}
        </p>
      )}
    </div>
  );
}
