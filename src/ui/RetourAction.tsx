"use client";

import { useEffect, type ReactNode } from "react";
import { Icone } from "./Icone";

/** Petit son de confirmation, sans fichier à télécharger. */
function bip() {
  try {
    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexte) return;
    const contexte = new Contexte();
    const oscillateur = contexte.createOscillator();
    const volume = contexte.createGain();
    oscillateur.frequency.value = 880;
    volume.gain.value = 0.08;
    oscillateur.connect(volume).connect(contexte.destination);
    oscillateur.onended = () => void contexte.close();
    oscillateur.start();
    oscillateur.stop(contexte.currentTime + 0.12);
  } catch {
    // Le son est un plus : la confirmation reste visible et annoncée.
  }
}

/** Confirmation visuelle, sonore et par vibration après une action (spec §9, règle 6). */
export function RetourAction({ message, children }: { message: string; children?: ReactNode }) {
  useEffect(() => {
    navigator.vibrate?.(80);
    bip();
  }, [message]);
  return (
    <div role="status" className="flex animate-arrivee items-center gap-3 rounded-carte bg-nuit px-4 py-3 text-white">
      <Icone nom="ph-check-circle" className="size-6 shrink-0 text-lavande-3" />
      <p className="flex-1 font-bold">{message}</p>
      {children}
    </div>
  );
}
