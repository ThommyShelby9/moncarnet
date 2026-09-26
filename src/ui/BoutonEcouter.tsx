"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icone } from "./Icone";

const aucunAbonnement = () => () => {};
const syntheseDuNavigateur = () => "speechSynthesis" in window;
const syntheseCoteServeur = () => false;

type Props = {
  libelle: string;
  sousLibelle?: string;
  source?: string;
  texte?: string;
  langueTexte?: string;
  className?: string;
  /** « pastille » et « rond » : le rond seul, le libellé devient le nom accessible. */
  variante?: "complet" | "pastille" | "rond";
};

export function BoutonEcouter({ libelle, sousLibelle, source, texte, langueTexte = "fr-FR", className = "", variante = "complet" }: Props) {
  const [enLecture, setEnLecture] = useState(false);
  const synthese = useSyncExternalStore(aucunAbonnement, syntheseDuNavigateur, syntheseCoteServeur);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
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

  if (variante !== "complet") {
    const rond = variante === "rond";
    return (
      <button
        type="button"
        onClick={enLecture ? arreter : lancer}
        disabled={!disponible}
        aria-pressed={enLecture}
        aria-label={libelle}
        title={disponible ? libelle : "Audio indisponible"}
        className={`grid shrink-0 place-items-center rounded-full text-nuit disabled:opacity-50 ${
          rond ? "size-11 bg-soleil shadow-[0_0_0_6px_rgb(255_194_26_/_0.25)]" : "size-8 bg-soleil-pale"
        } ${enLecture ? "animate-pulsation" : ""} ${className}`}
      >
        <Icone nom={enLecture ? "ph-pause" : "ph-speaker-high"} className={rond ? "size-5" : "size-4"} />
      </button>
    );
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
      <span className={`grid size-14 shrink-0 place-items-center rounded-full bg-soleil text-nuit shadow-[0_0_0_7px_rgb(255_194_26_/_0.25)] ${enLecture ? "animate-pulsation" : ""}`}>
        <Icone nom={enLecture ? "ph-pause" : "ph-play"} className="size-6" />
      </span>
      <span>
        <span className="block font-bold">{libelle}</span>
        {sousLibelle && <span className="block text-sm opacity-80">{sousLibelle}</span>}
      </span>
    </button>
  );
}
