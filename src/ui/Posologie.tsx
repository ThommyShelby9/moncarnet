import { LIBELLE_MOMENT_POSOLOGIE, MOMENTS_PRISE, type MomentPrise } from "@/domain/temps";
import { Icone } from "./Icone";
import { ICONE_MOMENT } from "./pictogrammes";

/** Posologie dessinée : soleil levant, soleil, lune, et autant de comprimés que de prises (spec §4.6). */
export function Posologie({ ligne, grande = false }: { ligne: Record<MomentPrise, number>; grande?: boolean }) {
  return (
    <ul aria-label="Quand le prendre" className="grid grid-cols-3 gap-2">
      {MOMENTS_PRISE.map((moment) => {
        const n = ligne[moment];
        const nuit = moment === "soir";
        return (
          <li
            key={moment}
            aria-label={`${LIBELLE_MOMENT_POSOLOGIE[moment]} : ${n === 0 ? "rien" : `${n} comprimé${n > 1 ? "s" : ""}`}`}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center ${n === 0 ? "bg-lavande opacity-60" : nuit ? "bg-lavande-2" : "bg-soleil-pale"}`}
          >
            <Icone nom={ICONE_MOMENT[moment]} className={`${grande ? "size-9" : "size-6"} ${nuit ? "text-marque" : "text-soleil-appuye"}`} />
            <span aria-hidden="true" className="text-xs font-bold">
              {LIBELLE_MOMENT_POSOLOGIE[moment]}
            </span>
            <span aria-hidden="true" className="flex min-h-4 flex-wrap justify-center gap-1">
              {n === 0 ? (
                <span className="text-xs text-gris">—</span>
              ) : (
                Array.from({ length: n }, (_, i) => <i key={i} className={`rounded-full bg-marque ${grande ? "h-3.5 w-6" : "h-2.5 w-4"}`} />)
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
