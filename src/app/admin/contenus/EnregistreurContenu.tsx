"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icone } from "@/ui/Icone";

const DUREE_MAX_S = 90;
const TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
const aucunAbonnement = () => () => {};
const microDisponible = () => "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia);

const ERREURS: Record<string, string> = {
  trop_lourd: "Enregistrement trop long : 1 Mo au plus (environ une minute).",
  invalide: "Ce fichier n'est pas un son lisible (webm, ogg, mp3, m4a ou wav).",
  interdit: "Seule l'administration peut enregistrer les contenus.",
  introuvable: "Ce contenu n'existe plus.",
};

/**
 * La version parlée d'un contenu dans une langue : on l'enregistre au micro (on écoute avant de garder),
 * ou on choisit un fichier déjà enregistré. C'est elle qu'entendent les familles.
 */
export function EnregistreurContenu({ code, langue, libelleLangue, audio }: { code: string; langue: string; libelleLangue: string; audio: string | null }) {
  const router = useRouter();
  const micro = useSyncExternalStore(aucunAbonnement, microDisponible, () => false);
  const [enregistre, setEnregistre] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [brouillon, setBrouillon] = useState<Blob | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const apercu = useMemo(() => (brouillon ? URL.createObjectURL(brouillon) : null), [brouillon]);
  useEffect(() => () => void (apercu && URL.revokeObjectURL(apercu)), [apercu]);

  useEffect(() => {
    if (!enregistre) return;
    const debut = Date.now();
    const minuterie = window.setInterval(() => {
      const ecoule = Math.floor((Date.now() - debut) / 1000);
      setSecondes(ecoule);
      if (ecoule >= DUREE_MAX_S) enregistreur.current?.stop();
    }, 250);
    return () => window.clearInterval(minuterie);
  }, [enregistre]);

  async function commencer() {
    setMessage(null);
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(flux, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32_000 });
      const morceaux: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) morceaux.push(e.data);
      };
      r.onstop = () => {
        flux.getTracks().forEach((piste) => piste.stop());
        setEnregistre(false);
        if (morceaux.length) setBrouillon(new Blob(morceaux, { type: r.mimeType || type || "audio/webm" }));
      };
      r.start();
      enregistreur.current = r;
      setSecondes(0);
      setBrouillon(null);
      setEnregistre(true);
    } catch {
      setMessage("Le micro n'est pas accessible : autorisez-le, ou choisissez un fichier.");
    }
  }

  async function envoyer(son: Blob) {
    setEnvoi(true);
    setMessage(null);
    const reponse = await fetch(`/api/admin/contenus/${encodeURIComponent(code)}/${langue}`, { method: "POST", headers: { "Content-Type": son.type || "audio/webm" }, body: son }).catch(() => null);
    setEnvoi(false);
    if (!reponse?.ok) {
      const erreur = reponse ? ((await reponse.json().catch(() => ({}))) as { erreur?: string }).erreur : null;
      setMessage(ERREURS[erreur ?? ""] ?? "L'envoi n'a pas abouti : vérifiez le réseau et réessayez.");
      return;
    }
    setBrouillon(null);
    setMessage(`Version en ${libelleLangue.toLowerCase()} enregistrée : les familles l'entendent désormais.`);
    router.refresh();
  }

  async function supprimer() {
    setEnvoi(true);
    await fetch(`/api/admin/contenus/${encodeURIComponent(code)}/${langue}`, { method: "DELETE" }).catch(() => null);
    setEnvoi(false);
    setMessage("Enregistrement supprimé : la voix du téléphone lit le texte français.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {audio && !brouillon && (
        <div className="flex flex-wrap items-center gap-2">
          <audio controls preload="none" src={audio} className="h-10 max-w-full" aria-label={`Version en ${libelleLangue}`} />
          <button type="button" onClick={supprimer} disabled={envoi} className="rounded-bouton px-3 py-2 text-sm font-bold text-urgence disabled:opacity-50">
            Supprimer
          </button>
        </div>
      )}
      {brouillon && apercu && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-soleil-pale p-2">
          <audio controls src={apercu} className="h-10 max-w-full" aria-label="Enregistrement à vérifier" />
          <button type="button" onClick={() => envoyer(brouillon)} disabled={envoi} className="rounded-bouton bg-marque px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            {envoi ? "Envoi…" : "Garder"}
          </button>
          <button type="button" onClick={() => setBrouillon(null)} className="rounded-bouton px-3 py-2 text-sm font-bold text-marque">
            Recommencer
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {micro && (
          <button
            type="button"
            onClick={enregistre ? () => enregistreur.current?.stop() : commencer}
            aria-pressed={enregistre}
            className={`flex items-center gap-2 rounded-bouton px-3 py-2 text-sm font-bold ${enregistre ? "bg-urgence text-white" : "bg-lavande-2 text-marque"}`}
          >
            <Icone nom={enregistre ? "ph-pause" : "ph-microphone"} className="size-4" />
            {enregistre ? `Arrêter (${secondes} s)` : audio ? `Réenregistrer en ${libelleLangue.toLowerCase()}` : `Enregistrer en ${libelleLangue.toLowerCase()}`}
          </button>
        )}
        <label className="flex cursor-pointer items-center gap-2 rounded-bouton px-3 py-2 text-sm font-bold text-marque hover:bg-lavande">
          <Icone nom="ph-cloud-arrow-up" className="size-4" />
          Choisir un fichier
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(e) => {
              const fichier = e.target.files?.[0];
              e.target.value = "";
              if (fichier) void envoyer(fichier);
            }}
          />
        </label>
      </div>
      {message && (
        <p role="status" className="text-sm font-bold text-nuit">
          {message}
        </p>
      )}
    </div>
  );
}
