"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./Icone";
import type { NomIcone } from "./icones";

const ONGLETS: { href: string; libelle: string; icone: NomIcone }[] = [
  { href: "/", libelle: "Accueil", icone: "ph-house" },
  { href: "/rendez-vous", libelle: "Rendez-vous", icone: "ph-calendar-dots" },
  { href: "/carnet", libelle: "Mon carnet", icone: "ph-list-checks" },
  { href: "/famille", libelle: "Famille", icone: "ph-users-three" },
];

/** Deux niveaux de navigation au plus : ces quatre onglets, puis l'écran. */
export function BarreNavigation() {
  const chemin = usePathname();
  return (
    <nav aria-label="Navigation principale" className="sticky bottom-0 z-20 border-t border-lavande-2 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="grid grid-cols-4 px-1.5 pt-2">
        {ONGLETS.map((o) => {
          const actif = o.href === "/" ? chemin === "/" : chemin.startsWith(o.href);
          return (
            <li key={o.href}>
              <Link
                href={o.href}
                aria-current={actif ? "page" : undefined}
                className={`flex flex-col items-center gap-1 text-xs font-bold ${actif ? "text-marque" : "text-gris"}`}
              >
                <span className={`grid h-8 w-14 place-items-center rounded-full ${actif ? "bg-lavande-2" : ""}`}>
                  <Icone nom={o.icone} className="size-6" />
                </span>
                {o.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
