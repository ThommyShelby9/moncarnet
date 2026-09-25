"use client";

import { useActionState, useState } from "react";
import { enregistrerConsultationAction, type EtatFormulaire } from "../../../actions";

export interface EtapeAChoisir {
  code: string;
  motif: string;
  libelle: string;
  /** Étape en retard ou prévue dans les 14 jours : proposée par défaut. */
  proche: boolean;
}

const CHAMP = "flex flex-col gap-1.5 text-sm font-bold";
const SAISIE = "h-11 rounded-xl bg-lavande px-3 text-base font-normal";

export function FormulaireConsultation({
  patientId,
  motifs,
  etapes,
  motifInitial,
}: {
  patientId: string;
  motifs: { code: string; libelle: string }[];
  etapes: EtapeAChoisir[];
  motifInitial: string;
}) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(enregistrerConsultationAction, {});
  const [motif, setMotif] = useState(etat.valeurs?.motif ?? motifInitial);
  const etapesDuMotif = etapes.filter((e) => e.motif === motif);
  const valeur = (nom: string) => etat.valeurs?.[nom] ?? "";
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5 rounded-carte bg-white p-5">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={CHAMP}>
          Motif
          <select name="motif" value={motif} onChange={(e) => setMotif(e.target.value)} className={SAISIE}>
            {motifs.map((m) => (
              <option key={m.code} value={m.code}>
                {m.libelle}
              </option>
            ))}
          </select>
        </label>
        {etapesDuMotif.length > 0 && (
          <label className={CHAMP}>
            Étape du programme
            <select key={motif} name="etape" defaultValue={valeur("etape") || (etapesDuMotif.find((e) => e.proche)?.code ?? "")} className={SAISIE}>
              <option value="">Aucune (consultation simple)</option>
              {etapesDuMotif.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.libelle}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-bold">Mesures, si elles sont prises</legend>
        <div className="flex items-end gap-2">
          <label className={`${CHAMP} flex-1`}>
            Tension (haut)
            <input name="tensionSys" inputMode="numeric" placeholder="140" defaultValue={valeur("tensionSys")} className={SAISIE} />
          </label>
          <span className="pb-2.5 text-lg font-bold">/</span>
          <label className={`${CHAMP} flex-1`}>
            Tension (bas)
            <input name="tensionDia" inputMode="numeric" placeholder="90" defaultValue={valeur("tensionDia")} className={SAISIE} />
          </label>
        </div>
        <label className={CHAMP}>
          Glycémie à jeun (g/L)
          <input name="glycemieGL" inputMode="decimal" placeholder="1,1" defaultValue={valeur("glycemieGL")} className={SAISIE} />
        </label>
        <label className={CHAMP}>
          Poids (kg)
          <input name="poidsKg" inputMode="decimal" defaultValue={valeur("poidsKg")} className={SAISIE} />
        </label>
        <label className={CHAMP}>
          Hémoglobine (g/dL)
          <input name="hemoglobineGDL" inputMode="decimal" defaultValue={valeur("hemoglobineGDL")} className={SAISIE} />
        </label>
      </fieldset>
      <label className={CHAMP}>
        Notes
        <textarea name="notes" rows={3} defaultValue={valeur("notes")} className="rounded-xl bg-lavande p-3 text-base font-normal" />
      </label>
      {etat.message && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="h-12 rounded-bouton bg-marque font-bold text-white disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer la consultation"}
      </button>
    </form>
  );
}
