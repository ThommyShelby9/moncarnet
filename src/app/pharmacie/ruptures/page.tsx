import type { Metadata } from "next";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { dateCourte } from "@/domain/temps";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { MEDICAMENT_MAX, rupturesDe } from "@/server/pharmacie/ruptures";
import { Icone } from "@/ui/Icone";
import { RetourAction } from "@/ui/RetourAction";
import { finirRuptureAction, signalerRuptureAction } from "../actions";

export const metadata: Metadata = { title: "Ruptures de stock" };

const NOTES: Record<string, { texte: string; ok: boolean }> = {
  signalee: { texte: "Rupture signalée : les soignants la voient en rédigeant une ordonnance.", ok: true },
  finie: { texte: "Médicament de nouveau disponible.", ok: true },
  deja_signalee: { texte: "Ce médicament est déjà signalé en rupture.", ok: false },
  invalide: { texte: `Écrivez le nom du médicament (${MEDICAMENT_MAX} caractères au plus).`, ok: false },
  introuvable: { texte: "Cette rupture est déjà terminée.", ok: false },
};

const jour = (d: Date) => dateCourte(aujourdhuiAuBenin(d));

/** Ce qui manque en rayon : signalé ici, vu par les soignants avant de prescrire. */
export default async function Ruptures({ searchParams }: PageProps<"/pharmacie/ruptures">) {
  const compte = await exigerRole("pharmacie");
  const params = await searchParams;
  const note = typeof params.note === "string" ? NOTES[params.note] : undefined;
  const depuis = new Date(Date.parse(`${aujourdhuiAuBenin()}T00:00:00+01:00`) - 30 * 86_400_000);
  const { enCours, finies } = compte.etablissementId ? await rupturesDe(db(), compte.etablissementId, depuis) : { enCours: [], finies: [] };
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold">Ruptures de stock</h1>
        <p className="mt-1 text-gris">
          Un médicament qui manque est signalé aux soignants : ils prescrivent autre chose ou orientent vers une autre pharmacie.
        </p>
      </header>
      {note?.ok && <RetourAction message={note.texte} />}
      {note && !note.ok && (
        <p role="alert" className="rounded-carte bg-soleil-pale px-4 py-3 font-bold">
          {note.texte}
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <section aria-labelledby="titre-en-cours" className="rounded-carte bg-white p-5">
            <h2 id="titre-en-cours" className="text-lg font-bold">
              En rupture
            </h2>
            {enCours.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {enCours.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-urgence-pale px-3 py-2.5">
                    <Icone nom="ph-package" className="size-6 text-urgence" />
                    <span className="min-w-0 flex-1">
                      <b>{r.medicament}</b>
                      <small className="block text-sm text-gris">Depuis le {jour(r.signaleeLe)}</small>
                    </span>
                    <form action={finirRuptureAction}>
                      <input type="hidden" name="ruptureId" value={r.id} />
                      <button className="flex items-center gap-1.5 rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
                        <Icone nom="ph-check" className="size-4" />
                        De nouveau disponible
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-gris">Rien ne manque pour le moment.</p>
            )}
          </section>
          {finies.length > 0 && (
            <section aria-labelledby="titre-finies" className="rounded-carte bg-white p-5">
              <h2 id="titre-finies" className="text-lg font-bold">
                Revenus ces 30 derniers jours
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {finies.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-lavande px-3 py-2.5">
                    <Icone nom="ph-check-circle" className="size-5 text-marque" />
                    <span>
                      <b>{r.medicament}</b> : manquant du {jour(r.signaleeLe)} au {jour(r.finieLe!)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <form action={signalerRuptureAction} className="flex flex-col gap-3 rounded-carte bg-white p-5">
          <h2 className="text-lg font-bold">Signaler une rupture</h2>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Médicament et dosage
            <input
              name="medicament"
              required
              minLength={2}
              maxLength={MEDICAMENT_MAX}
              placeholder="Amoxicilline 500 mg"
              className="rounded-bouton border-2 border-lavande-3 px-3 py-2.5 font-normal"
            />
          </label>
          <button className="flex items-center justify-center gap-2 rounded-bouton bg-urgence py-3 font-bold text-white">
            <Icone nom="ph-package" className="size-5" />
            Signaler la rupture
          </button>
        </form>
      </div>
    </>
  );
}
