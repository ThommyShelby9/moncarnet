"use client";

import { heureMinute } from "@/domain/temps";
import type { Refus, SaisieEnAttente } from "@/offline/file";
import { Icone } from "@/ui/Icone";

type Props = {
  file: SaisieEnAttente[];
  refus: Refus[];
  horsLigne: boolean;
  onEnvoyer: () => void;
  onRetirer: (id: string) => void;
  onRetour: () => void;
};

/** Ce qui attend le réseau, et ce que le centre n'a pas pu recevoir, avec la raison (spec §10.2). */
export function VueEnvoi({ file, refus, horsLigne, onEnvoyer, onRetirer, onRetour }: Props) {
  // Une ligne par visite ou inscription : la saisie qui porte l'identifiant du groupe.
  const principales = file.filter((s) => s.id === s.groupe);
  return (
    <main className="cascade mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-lavande px-4 py-5">
      <button type="button" onClick={onRetour} className="flex items-center gap-2 self-start rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-5" />
        Ma tournée
      </button>
      <h1 className="text-2xl font-bold">Envois</h1>

      <section aria-labelledby="titre-attente" className="rounded-carte bg-white p-4">
        <h2 id="titre-attente" className="font-bold">
          À envoyer
        </h2>
        {principales.length ? (
          <>
            <ul className="mt-2 flex flex-col gap-2">
              {principales.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <Icone nom="ph-cloud-arrow-up" className="size-5 shrink-0 text-marque" />
                  <span className="flex-1">{s.libelle}</span>
                  <span className="text-xs text-gris">{heureMinute(new Date(s.survenuLe))}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onEnvoyer}
              disabled={horsLigne}
              className="mt-3 w-full rounded-bouton bg-marque py-3 font-bold text-white disabled:bg-lavande-4"
            >
              {horsLigne ? "Pas de réseau : envoi au retour du réseau" : "Envoyer maintenant"}
            </button>
          </>
        ) : (
          <p className="mt-1 text-gris">Tout est parti.</p>
        )}
      </section>

      {refus.length > 0 && (
        <section aria-labelledby="titre-corriger" className="rounded-carte bg-white p-4">
          <h2 id="titre-corriger" className="font-bold text-urgence">
            À corriger
          </h2>
          <p className="text-sm text-gris">Le centre n&apos;a pas pu recevoir ces saisies. Refaites-les si besoin, puis retirez-les de la liste.</p>
          <ul className="mt-2 flex flex-col gap-3">
            {refus.map((r) => (
              <li key={r.saisie.id} className="rounded-2xl bg-urgence-pale p-3">
                <b className="block">{r.saisie.libelle}</b>
                <p className="text-sm">{r.motif}</p>
                <button type="button" onClick={() => onRetirer(r.saisie.id)} className="mt-2 text-sm font-bold text-marque underline">
                  Retirer de la liste
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
