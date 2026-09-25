"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "./Icone";

type Props = {
  libelle: string;
  sousLibelle?: string;
  source?: string;
  texte?: string;
  langueTexte?: string;
  className?: string;
};

export function BoutonEcouter({ libelle, sousLibelle, source, texte, langueTexte = "fr-FR", className = "" }: Props) {
  const [enLecture, setEnLecture] = useState(false);
  const [synthese, setSynthese] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSynthese("speechSynthesis" in window);
    return () => {
      audio.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const disponible = Boolean(source) || (Boolean(texte) && synthese);

  function arreter() {
    audio.current?.pause();
    if (synthese) window.speechSynthesis.cancel();
    setEnLecture(false);
  }

  function lancer() {
    if (source) {
      audio.current ??= new Audio(source);
      audio.current.onended = () => setEnLecture(false);
      audio.current
        .play()
        .then(() => setEnLecture(true))
        .catch(() => setEnLecture(false));
      return;
    }
    if (texte && synthese) {
      const enonce = new SpeechSynthesisUtterance(texte);
      enonce.lang = langueTexte;
      enonce.onend = () => setEnLecture(false);
      window.speechSynthesis.speak(enonce);
      setEnLecture(true);
    }
  }

  return (
    <button
      type="button"
      onClick={enLecture ? arreter : lancer}
      disabled={!disponible}
      aria-pressed={enLecture}
      title={disponible ? undefined : "Audio indisponible"}
      className={`inline-flex items-center gap-3 text-left disabled:opacity-50 ${className}`}
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-soleil text-nuit shadow-[0_0_0_7px_rgb(255_194_26_/_0.25)]">
        <Icone nom={enLecture ? "ph-pause" : "ph-play"} className="size-6" />
      </span>
      <span>
        <span className="block font-bold">{libelle}</span>
        {sousLibelle && <span className="block text-sm opacity-80">{sousLibelle}</span>}
      </span>
    </button>
  );
}
