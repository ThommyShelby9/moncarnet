import Link from "next/link";
import { BoutonEcouter } from "./BoutonEcouter";
import { Etapes } from "./Etapes";
import { Icone } from "./Icone";

/** En-tête d'un parcours « une question par écran » : retour, avancement, écouter, puis la question. */
export function EnTeteQuestion({
  retour,
  etape,
  total = 4,
  question,
  aide,
  ecoute,
}: {
  retour: string;
  etape?: number;
  total?: number;
  question: string;
  aide?: string;
  ecoute: string;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href={retour} aria-label="Retour" className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
          <Icone nom="ph-arrow-left" className="size-5" />
        </Link>
        {etape ? <Etapes numero={etape} total={total} /> : <span className="flex-1" />}
        <BoutonEcouter variante="rond" libelle="Écouter la question" texte={ecoute} />
      </div>
      <h1 className="text-[1.45rem] leading-tight font-bold">
        {question}
        {aide && <small className="mt-1 block text-sm font-normal text-gris">{aide}</small>}
      </h1>
    </header>
  );
}
