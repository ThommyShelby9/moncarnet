"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import { Icone } from "./Icone";

/** Une chose à la fois : les cartes défilent d'un geste du doigt, ou avec les flèches. */
export function PileDeCartes({ titre, children }: { titre: string; children: ReactNode }) {
  const cartes = Children.toArray(children);
  const liste = useRef<HTMLOListElement>(null);
  const [position, setIndex] = useState(0);
  const total = cartes.length;
  // La pile peut raccourcir après « C'est fait » : on reste sur la dernière carte plutôt que d'afficher « 3 sur 2 ».
  const index = Math.min(position, Math.max(total - 1, 0));

  function aller(cible: number) {
    const i = Math.min(Math.max(cible, 0), total - 1);
    const element = liste.current?.children[i] as HTMLElement | undefined;
    element?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "start" });
    setIndex(i);
  }

  function suivreLeDoigt() {
    const el = liste.current;
    if (el && el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <section aria-label={titre} className="flex flex-col gap-3">
      <div className="relative pb-4">
        {total > 1 && (
          <>
            <span aria-hidden="true" className="absolute inset-x-[18px] bottom-0 h-8 rounded-b-grande bg-lavande-4" />
            <span aria-hidden="true" className="absolute inset-x-[9px] bottom-2 h-8 rounded-b-grande bg-lavande-5" />
          </>
        )}
        <ol
          ref={liste}
          onScroll={suivreLeDoigt}
          className="relative z-10 flex snap-x snap-mandatory overflow-x-auto rounded-grande [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cartes.map((carte, i) => (
            <li key={i} aria-label={`${i + 1} sur ${total}`} className="w-full shrink-0 snap-start">
              {carte}
            </li>
          ))}
        </ol>
      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => aller(index - 1)}
            disabled={index === 0}
            aria-label="Carte précédente"
            className="grid size-10 place-items-center rounded-full bg-white text-marque disabled:opacity-40"
          >
            <Icone nom="ph-arrow-left" className="size-5" />
          </button>
          <p aria-live="polite" className="flex items-center gap-1.5 text-xs font-bold text-gris">
            {cartes.map((_, i) => (
              <i key={i} aria-hidden="true" className={i === index ? "h-[7px] w-5 rounded bg-marque" : "size-[7px] rounded-full bg-lavande-3"} />
            ))}
            <span className="ml-1">
              {index + 1} sur {total}
            </span>
          </p>
          <button
            type="button"
            onClick={() => aller(index + 1)}
            disabled={index === total - 1}
            aria-label="Carte suivante"
            className="grid size-10 place-items-center rounded-full bg-white text-marque disabled:opacity-40"
          >
            <Icone nom="ph-arrow-left" className="size-5 rotate-180" />
          </button>
        </div>
      )}
    </section>
  );
}
