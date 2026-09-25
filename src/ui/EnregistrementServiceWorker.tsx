"use client";

import { useEffect } from "react";

/** En production seulement : les pages ouvertes restent lisibles sans réseau (spec §10.3). */
export function EnregistrementServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((erreur: unknown) => {
      // Sans service worker, l'application marche comme avant, avec du réseau.
      console.warn("Service worker non enregistré :", erreur);
    });
  }, []);
  return null;
}
