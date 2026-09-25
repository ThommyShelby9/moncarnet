import Link from "next/link";
import { libellePlaces, type JourPropose } from "@/domain/rendez-vous";
import { LIBELLE_MOMENT_RDV, majuscule, nomDuJour } from "@/domain/temps";
import { Icone } from "./Icone";

const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;

/** Un jour proposé : le calendrier, les soleils qui disent dans combien de jours, et les places. */
export function JourDisponible({ jour, href }: { jour: JourPropose; href: string }) {
  const date = new Date(`${jour.date}T00:00:00Z`);
  return (
    <Link href={href} className="flex items-center gap-3 rounded-carte bg-white px-3.5 py-2.5">
      <span className={`grid h-[50px] w-[46px] shrink-0 place-items-center rounded-bouton leading-none ${jour.complet ? "bg-lavande text-gris" : "bg-lavande-2 text-marque"}`}>
        <span className="text-[0.62rem] font-bold">{JOURS_COURTS[date.getUTCDay()]}</span>
        <b className="text-xl tabular-nums">{date.getUTCDate()}</b>
      </span>
      <span className="min-w-0 flex-1">
        <b className="block">
          {jour.dansJours < 7 ? jour.libelle : majuscule(nomDuJour(jour.date))}, {LIBELLE_MOMENT_RDV[jour.moment]}
        </b>
        <span className="mt-0.5 flex items-center gap-1 text-sm text-gris">
          {Array.from({ length: jour.soleils }, (_, i) => (
            <Icone key={i} nom="ph-sun" className="size-4 text-soleil-appuye" />
          ))}
          {jour.quand}
        </span>
      </span>
      <span className={`rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap ${jour.complet ? "bg-soleil-pale text-nuit" : "bg-lavande-2 text-marque"}`}>
        {jour.complet ? "Liste d'attente" : libellePlaces(jour.places)}
      </span>
    </Link>
  );
}
