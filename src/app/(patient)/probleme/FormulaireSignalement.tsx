"use client";

import { useOffline } from "next/offline";
import { useRef, useState, useTransition } from "react";
import type { CodeSigne } from "@/domain/signes-danger";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { ICONE_SIGNE } from "@/ui/pictogrammes";
import { RetourAction } from "@/ui/RetourAction";
import { annulerAlerteAction, signalerAction } from "../actions";

type Etat =
  | { etape: "choix" }
  | { etape: "envoi" }
  | { etape: "recu"; alerteId: string; recueLe: string; centre: string }
  | { etape: "erreur"; message: string };

interface Props {
  patientId: string;
  /** Prénom de la personne quand ce n'est pas le titulaire du compte. */
  prenom: string | null;
  signes: { code: CodeSigne; libelle: string }[];
  centre: { nom: string; telephone: string | null };
  conseil: string;
  /** Le conseil enregistré dans la langue de la personne (administration), joué à la place de la voix du téléphone. */
  audioConseil?: string | null;
}

const heureLocale = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Porto-Novo" }).format(new Date(iso)).replace(":", " h ");

export function FormulaireSignalement({ patientId, prenom, signes, centre, conseil, audioConseil = null }: Props) {
  const [etat, setEtat] = useState<Etat>({ etape: "choix" });
  const [, demarrer] = useTransition();
  const horsLigne = useOffline();
  const identifiant = useRef<string | null>(null);
  const question = prenom ? `Qu'est-ce qui ne va pas pour ${prenom} ?` : "Qu'est-ce qui ne va pas ?";

  function envoyer(signe: CodeSigne) {
    identifiant.current ??= crypto.randomUUID();
    const evenementId = identifiant.current;
    setEtat({ etape: "envoi" });
    demarrer(async () => {
      const reponse = await signalerAction({ evenementId, patientId, signe });
      setEtat(reponse.ok ? { etape: "recu", alerteId: reponse.alerteId, recueLe: reponse.recueLe, centre: reponse.centre } : { etape: "erreur", message: reponse.message });
    });
  }

  if (etat.etape === "choix") {
    return (
      <>
        <div className="flex items-start gap-3">
          <h1 className="flex-1 text-[1.45rem] leading-tight font-bold">
            {question}
            <small className="mt-1 block text-sm font-normal text-gris">Touchez une image : l&apos;alerte part tout de suite au centre de santé.</small>
          </h1>
          <BoutonEcouter
            variante="rond"
            libelle="Écouter"
            texte={`${question} ${signes.map((s) => s.libelle).join(", ")}. L'alerte part tout de suite au centre de santé.`}
          />
        </div>
        <ul className="grid grid-cols-2 gap-2.5">
          {signes.map((s) => (
            <li key={s.code}>
              <button type="button" onClick={() => envoyer(s.code)} className="flex h-24 w-full flex-col justify-between rounded-carte bg-white p-3 text-left font-bold">
                <Icone nom={ICONE_SIGNE[s.code]} className="size-9 text-urgence" />
                {s.libelle}
              </button>
            </li>
          ))}
        </ul>
        <Appeler centre={centre} discret />
      </>
    );
  }

  if (etat.etape === "envoi") {
    return horsLigne ? (
      <>
        <section role="alert" className="flex flex-col gap-3 rounded-grande bg-urgence-pale p-5">
          <Icone nom="ph-wifi-slash" className="size-9 text-urgence" />
          <h1 className="text-xl font-bold text-urgence">L&apos;alerte n&apos;est pas encore partie</h1>
          <p>Il n&apos;y a pas de réseau. Elle partira toute seule dès que le réseau revient. N&apos;attendez pas :</p>
          <p className="font-bold">{conseil}</p>
          <BoutonEcouter libelle="Écouter le conseil" {...(audioConseil ? { source: audioConseil } : { texte: `L'alerte n'est pas encore partie. ${conseil}` })} />
        </section>
        <Appeler centre={centre} />
      </>
    ) : (
      <>
        <p role="status" className="rounded-grande bg-white p-5 text-lg font-bold">
          Envoi de l&apos;alerte au {centre.nom}…
        </p>
        <Appeler centre={centre} discret />
      </>
    );
  }

  if (etat.etape === "recu") {
    return (
      <>
        <RetourAction message="Le centre a reçu votre alerte" />
        <section className="flex flex-col gap-2 rounded-grande bg-white p-5">
          <h1 className="text-xl font-bold">Alerte reçue à {heureLocale(etat.recueLe)}</h1>
          <p>Le {etat.centre} a reçu l&apos;alerte. Un soignant va s&apos;en occuper.</p>
          <p className="font-bold">{conseil}</p>
          <BoutonEcouter libelle="Écouter" {...(audioConseil ? { source: audioConseil } : { texte: `Le centre a reçu votre alerte. Un soignant va s'en occuper. ${conseil}` })} />
        </section>
        <Appeler centre={centre} />
        <form action={annulerAlerteAction}>
          <input type="hidden" name="alerteId" value={etat.alerteId} />
          <button className="w-full py-3 font-bold text-gris underline">Je me suis trompé : annuler l&apos;alerte</button>
        </form>
      </>
    );
  }

  return (
    <>
      <p role="alert" className="rounded-grande bg-urgence-pale p-5 font-bold text-urgence">
        {etat.message}
      </p>
      <Appeler centre={centre} />
      <button type="button" onClick={() => setEtat({ etape: "choix" })} className="py-3 font-bold text-marque underline">
        Réessayer
      </button>
    </>
  );
}

function Appeler({ centre, discret = false }: { centre: Props["centre"]; discret?: boolean }) {
  const numero = centre.telephone ? normaliserTelephone(centre.telephone) : null;
  if (!numero) return null;
  return (
    <a
      href={`tel:${numero}`}
      className={`flex h-14 items-center justify-center gap-2 rounded-bouton text-lg font-bold ${discret ? "bg-white text-urgence" : "bg-urgence text-white"}`}
    >
      <Icone nom="ph-phone" className="size-6" />
      Appeler le centre : {formaterTelephone(numero)}
    </a>
  );
}
