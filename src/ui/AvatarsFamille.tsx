import Link from "next/link";
import { iconePourPersonne } from "./avatar";
import { Icone } from "./Icone";

export interface PersonneAvatar {
  patientId: string;
  prenom: string;
  sexe: "F" | "M";
  age: number;
}

/** Changer de carnet d'un geste : un avatar et un prénom par personne de la famille. */
export function AvatarsFamille({ personnes, actif, lien }: { personnes: PersonneAvatar[]; actif: string; lien: (patientId: string) => string }) {
  if (personnes.length < 2) return null;
  return (
    <nav aria-label="Changer de carnet">
      <ul className="flex gap-2">
        {personnes.map((p) => {
          const estActif = p.patientId === actif;
          return (
            <li key={p.patientId}>
              <Link
                href={lien(p.patientId)}
                aria-current={estActif ? "true" : undefined}
                className={`flex w-14 flex-col items-center gap-1 text-xs font-bold ${estActif ? "text-marque" : "text-gris"}`}
              >
                <span className={`grid size-11 place-items-center rounded-full bg-white text-marque ${estActif ? "ring-3 ring-marque" : ""}`}>
                  <Icone nom={iconePourPersonne(p.sexe, p.age)} className="size-7" />
                </span>
                <span className="max-w-full truncate">{p.prenom}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
