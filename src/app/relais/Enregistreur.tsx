"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { NoteLocale } from "@/offline/stockage";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";

const DUREE_MAX_S = 60;
const TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
const aucunAbonnement = () => () => {};
const microDisponible = () => "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia);

/** « Maintenir pour raconter la visite » : la note reste sur le téléphone et part après la visite. */
export function Enregistreur({ note, onNote }: { note: NoteLocale | null; onNote: (note: NoteLocale | null) => void }) {
  const disponible = useSyncExternalStore(aucunAbonnement, microDisponible, () => false);
  const [enregistre, setEnregistre] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [refuse, setRefuse] = useState(false);
  const appuye = useRef(false);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const url = useMemo(() => (note ? URL.createObjectURL(new Blob([note.octets], { type: note.type })) : null), [note]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const arreter = useCallback(() => {
    appuye.current = false;
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
    enregistreur.current = null;
    setEnregistre(false);
  }, []);

  useEffect(() => {
    if (!enregistre) return;
    const debut = Date.now();
    const minuterie = window.setInterval(() => {
      const ecoule = Math.floor((Date.now() - debut) / 1000);
      setSecondes(ecoule);
      if (ecoule >= DUREE_MAX_S) arreter();
    }, 250);
    return () => window.clearInterval(minuterie);
  }, [enregistre, arreter]);

  async function commencer() {
    appuye.current = true;
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Le relais a lâché pendant la demande d'accès au micro : on n'enregistre pas.
      if (!appuye.current) {
        flux.getTracks().forEach((piste) => piste.stop());
        return;
      }
      const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(flux, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 24_000 });
      const morceaux: Blob[] = [];
      const debut = Date.now();
      r.ondataavailable = (e) => {
        if (e.data.size) morceaux.push(e.data);
      };
      r.onstop = async () => {
        flux.getTracks().forEach((piste) => piste.stop());
        const duree = Math.round((Date.now() - debut) / 1000);
        if (duree < 1 || morceaux.length === 0) return;
        const blob = new Blob(morceaux, { type: r.mimeType || type || "audio/webm" });
        onNote({ type: blob.type, octets: await blob.arrayBuffer(), dureeSecondes: duree });
      };
      r.start();
      enregistreur.current = r;
      setSecondes(0);
      setRefuse(false);
      setEnregistre(true);
    } catch {
      setRefuse(true);
    }
  }

  if (!disponible) {
    return <p className="rounded-carte bg-white p-4 text-sm text-gris">Enregistrer la voix n&apos;est pas possible sur ce téléphone : écrivez un mot pour le centre.</p>;
  }

  return (
    <section className="flex items-center gap-4 rounded-carte bg-white p-4">
      <button
        type="button"
        aria-label={enregistre ? "Relâcher pour arrêter" : "Maintenir pour raconter la visite"}
        aria-pressed={enregistre}
        onPointerDown={(e) => {
          e.preventDefault();
          void commencer();
        }}
        onPointerUp={arreter}
        onPointerCancel={arreter}
        onPointerLeave={() => appuye.current && arreter()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            void commencer();
          }
        }}
        onKeyUp={(e) => (e.key === " " || e.key === "Enter") && arreter()}
        onContextMenu={(e) => e.preventDefault()}
        className={`grid size-16 shrink-0 touch-none place-items-center rounded-full ring-8 select-none ${
          enregistre ? "bg-urgence text-white ring-urgence-pale" : "bg-soleil text-nuit ring-soleil-pale"
        }`}
      >
        <Icone nom="ph-microphone" className="size-8" />
      </button>
      <div className="min-w-0 flex-1">
        {enregistre ? (
          <p role="status" className="font-bold">
            J&apos;écoute… {secondes} s <span className="text-sm font-normal text-gris">(relâchez pour arrêter)</span>
          </p>
        ) : note && url ? (
          <div className="flex flex-wrap items-center gap-2">
            <BoutonEcouter key={url} variante="pastille" libelle={`Écouter ma visite, ${note.dureeSecondes} s`} source={url} />
            <b>Ma visite, {note.dureeSecondes} s</b>
            <button type="button" onClick={() => onNote(null)} className="text-sm font-bold text-marque underline">
              Effacer
            </button>
          </div>
        ) : (
          <>
            <b className="block">Maintenir pour raconter la visite</b>
            <small className="text-sm text-gris">
              {refuse ? "Le micro n'est pas autorisé : autorisez-le dans le navigateur, ou écrivez un mot." : `${DUREE_MAX_S} secondes au plus.`}
            </small>
          </>
        )}
      </div>
    </section>
  );
}
