import { Icone } from "@/ui/Icone";

/** Une seule case : nom, téléphone ou code du carnet. */
export function RechercheRapide({ valeur = "" }: { valeur?: string }) {
  return (
    <form action="/soignant/patients" role="search" className="flex min-w-[260px] items-center gap-2 rounded-bouton bg-white px-3.5">
      <Icone nom="ph-magnifying-glass" className="size-5 text-gris" />
      <label className="sr-only" htmlFor="q">
        Rechercher un patient
      </label>
      <input id="q" name="q" defaultValue={valeur} placeholder="Nom, téléphone ou code du carnet" className="h-11 flex-1 bg-transparent text-sm outline-none" />
    </form>
  );
}
