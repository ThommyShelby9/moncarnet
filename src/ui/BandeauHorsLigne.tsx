"use client";

import { useOffline } from "next/offline";
import { Icone } from "./Icone";

/** Dit clairement qu'il n'y a pas de réseau (détection de Next : `experimental.useOffline`). */
export function BandeauHorsLigne({ message = "Pas de réseau pour le moment. Ce que vous voyez peut dater un peu." }: { message?: string }) {
  const horsLigne = useOffline();
  if (!horsLigne) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-bouton bg-nuit px-4 py-3 text-sm font-bold text-white">
      <Icone nom="ph-wifi-slash" className="size-5 shrink-0" />
      {message}
    </p>
  );
}
