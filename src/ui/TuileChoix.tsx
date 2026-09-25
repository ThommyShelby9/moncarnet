import Link from "next/link";
import { BoutonEcouter } from "./BoutonEcouter";
import { Icone } from "./Icone";
import type { NomIcone } from "./icones";

/** Grande tuile : pictogramme + mot, toute la tuile est cliquable, le bouton écouter reste à part. */
export function TuileChoix({ href, icone, libelle, ecoute }: { href: string; icone: NomIcone; libelle: string; ecoute?: string }) {
  return (
    <div className="relative flex h-24 flex-col justify-between rounded-carte bg-white p-3 font-bold">
      <Icone nom={icone} className="size-9 text-marque" />
      <Link href={href} className="after:absolute after:inset-0 after:rounded-carte focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-soleil-appuye">
        {libelle}
      </Link>
      <BoutonEcouter variante="pastille" libelle={`Écouter : ${libelle}`} texte={ecoute ?? libelle} className="absolute top-2.5 right-2.5 z-10" />
    </div>
  );
}
