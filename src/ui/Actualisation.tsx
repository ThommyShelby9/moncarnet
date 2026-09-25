"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Rafraîchit la page à intervalles réguliers : une nouvelle alerte apparaît sans recharger. */
export function Actualisation({ secondes = 20 }: { secondes?: number }) {
  const routeur = useRouter();
  useEffect(() => {
    const minuteur = setInterval(() => routeur.refresh(), secondes * 1000);
    return () => clearInterval(minuteur);
  }, [routeur, secondes]);
  return null;
}
