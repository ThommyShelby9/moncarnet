import type { DateISO } from "@/domain/dates";
import { LIBELLES_CANAL, type CanalRappel } from "@/domain/rappels";
import { dateLongue, LIBELLE_MOMENT_RDV } from "@/domain/temps";
import { Icone } from "@/ui/Icone";
import { repondreRappelAction } from "../actions";

type Props = {
  rappelId: string;
  pour: string | null;
  vaccin: boolean;
  date: DateISO;
  moment: "matin" | "apres_midi" | null;
  canal: CanalRappel;
};

/** Le rappel reçu aussi dans l'application : « Je viendrai » confirme, « Je ne peux pas » libère la place pour quelqu'un d'autre. */
export function CarteRappel({ rappelId, pour, vaccin, date, moment, canal }: Props) {
  const quoi = vaccin ? "vaccin" : "rendez-vous";
  const titre = `${pour ? `Rappel pour ${pour}` : "Rappel"} : ${quoi} ${dateLongue(date)}${moment ? `, ${LIBELLE_MOMENT_RDV[moment]}` : ""}`;
  return (
    <section className="flex flex-col gap-3 rounded-carte bg-white p-4 shadow-[inset_4px_0_0_var(--color-soleil)]">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-soleil-pale text-soleil-fonce">
          <Icone nom="ph-bell" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block leading-snug">{titre}</b>
          <small className="text-sm text-gris">Reçu aussi par {LIBELLES_CANAL[canal]} (simulé). Dites-nous si vous venez.</small>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <form action={repondreRappelAction}>
          <input type="hidden" name="rappelId" value={rappelId} />
          <button name="reponse" value="viendra" className="flex h-12 w-full items-center justify-center gap-2 rounded-bouton bg-marque font-bold text-white">
            <Icone nom="ph-check-circle" className="size-5" />
            Je viendrai
          </button>
        </form>
        <form action={repondreRappelAction}>
          <input type="hidden" name="rappelId" value={rappelId} />
          <button name="reponse" value="empeche" className="flex h-12 w-full items-center justify-center gap-2 rounded-bouton bg-lavande-2 font-bold text-marque">
            <Icone nom="ph-x" className="size-5" />
            Je ne peux pas
          </button>
        </form>
      </div>
    </section>
  );
}
