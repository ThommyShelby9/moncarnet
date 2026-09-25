"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./Icone";
import type { NomIcone } from "./icones";

export interface LienMenu {
  href: string;
  libelle: string;
  icone: NomIcone;
}

/** Menu des espaces professionnels ; le premier lien (l'accueil de l'espace) n'est actif que sur son adresse exacte. */
export function MenuLateral({ liens }: { liens: LienMenu[] }) {
  const chemin = usePathname();
  return (
    <nav aria-label="Menu">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {liens.map((l, i) => {
          const actif = chemin === l.href || (i > 0 && chemin.startsWith(`${l.href}/`));
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold whitespace-nowrap ${actif ? "bg-lavande-2 text-marque" : "text-gris"}`}
              >
                <Icone nom={l.icone} className="size-5" />
                {l.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
