import { LIBELLES_SIGNES } from "@/domain/signes-danger";
import { heureMinute } from "@/domain/temps";
import type { AlerteOuverte } from "@/server/requetes/soignant";
import { CompteARebours } from "@/ui/CompteARebours";
import { Icone } from "@/ui/Icone";
import { prendreEnChargeAction } from "./actions";

/** Une alerte à prendre en charge : compte à rebours, signes, appeler, « Je la prends en charge ». */
export function CarteAlerte({ alerte, maintenant }: { alerte: AlerteOuverte; maintenant: Date }) {
  const qui = alerte.semainesGrossesse ? `enceinte de ${alerte.semainesGrossesse} semaines` : alerte.libelleAge;
  return (
    <article className="flex flex-wrap items-center gap-4 rounded-carte bg-white px-4 py-3.5 shadow-[inset_4px_0_0_var(--color-urgence)]">
      <CompteARebours echeance={alerte.echeance.toISOString()} maintenant={maintenant.toISOString()} />
      <div className="min-w-[220px] flex-1">
        <b className="block">
          {alerte.prenom} {alerte.nom}, {qui}
        </b>
        <p className="mt-0.5 text-sm text-gris">
          <span className="inline-flex items-center gap-1.5 font-bold text-urgence">
            <Icone nom="hi-alert-circle" className="size-4" />
            {alerte.signes.map((s) => LIBELLES_SIGNES[s]).join(", ")}
          </span>
          , signalé à {heureMinute(alerte.creeeLe)}. À rappeler avant {heureMinute(alerte.echeance)}.
        </p>
      </div>
      {alerte.telephone && (
        <a
          href={`tel:${alerte.telephone}`}
          className="flex items-center gap-2 rounded-bouton bg-white px-4 py-2.5 text-sm font-bold shadow-[inset_0_0_0_2px_var(--color-lavande-3)]"
        >
          <Icone nom="ph-phone" className="size-5" />
          Appeler
        </a>
      )}
      <form action={prendreEnChargeAction}>
        <input type="hidden" name="alerteId" value={alerte.id} />
        <button className="rounded-bouton bg-urgence px-4 py-2.5 text-sm font-bold text-white">
          Je {alerte.sexe === "F" ? "la" : "le"} prends en charge
        </button>
      </form>
    </article>
  );
}
