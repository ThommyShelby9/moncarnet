import Link from "next/link";
import type { CarteDuJour } from "@/domain/cartes-du-jour";
import { dateLongue, libelleDansJours, majuscule } from "@/domain/temps";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";

/** Le rendez-vous suivant, au-delà de la semaine : discret, sous la pile. */
export function Ensuite({ carte, pour }: { carte: CarteDuJour; pour: string | null }) {
  if (carte.type !== "rendez_vous") return null;
  return (
    <Link href="/rendez-vous" className="flex items-center gap-3 rounded-[20px] bg-white px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
        <Icone nom={ICONE_MOTIF[carte.motif]} className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-sm">
          Ensuite{pour ? ` pour ${pour}` : ""} : {carte.libelle}
        </b>
        <small className="text-xs text-gris">
          {majuscule(libelleDansJours(carte.dansJours))}, {dateLongue(carte.date)}
        </small>
      </span>
      <Icone nom="ph-caret-right" className="size-4 text-gris" />
    </Link>
  );
}
