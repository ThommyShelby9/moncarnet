import Link from "next/link";
import { CODES_INDICATEURS, INDICATEURS, type CodeIndicateur } from "@/domain/pilotage";
import type { AlertesEnDirect } from "@/server/requetes/pilotage";
import { Icone } from "@/ui/Icone";

/** Les indicateurs qui se lisent en taux ou en délai (les nombres bruts n'ont pas d'objectif). */
export const TAUX = CODES_INDICATEURS.filter((c) => INDICATEURS[c].unite !== "nombre");

export const lireCode = (v: unknown, codes: readonly CodeIndicateur[] = TAUX, parDefaut: CodeIndicateur = "cpn4"): CodeIndicateur =>
  codes.find((c) => c === v) ?? parDefaut;

export function Confidentialite() {
  return (
    <p className="flex items-center gap-2 rounded-carte bg-lavande-2 px-4 py-3 text-sm font-bold text-marque">
      <Icone nom="ph-shield-check" className="size-5 shrink-0" />
      Aucun nom ne sort de cet écran. Un chiffre qui porte sur moins de 5 personnes est masqué.
    </p>
  );
}

export function Onglets({ actif, base, codes = TAUX }: { actif: CodeIndicateur; base: string; codes?: readonly CodeIndicateur[] }) {
  return (
    <nav aria-label="Indicateur" className="flex gap-2 overflow-x-auto pb-1">
      {codes.map((c) => (
        <Link
          key={c}
          href={`${base}${c}`}
          aria-current={c === actif ? "page" : undefined}
          scroll={false}
          className={`rounded-bouton px-3 py-2 text-sm font-bold whitespace-nowrap ${c === actif ? "bg-marque text-white" : "bg-white text-marque"}`}
        >
          {INDICATEURS[c].court}
        </Link>
      ))}
    </nav>
  );
}

/** Les alertes qui attendent dans la zone, en direct : celles en retard remontent ici (spec §14). */
export function EnCeMoment({ alertes }: { alertes: AlertesEnDirect }) {
  const retard = alertes.enRetard > 0;
  return (
    <section
      aria-labelledby="titre-maintenant"
      className={`flex items-center gap-3 rounded-carte px-4 py-3 ${retard ? "bg-urgence-pale text-urgence" : "bg-white text-nuit"}`}
    >
      <Icone nom="hi-alert-circle" className={`size-7 shrink-0 ${retard ? "text-urgence" : "text-marque"}`} />
      <div>
        <h2 id="titre-maintenant" className="text-sm font-bold text-gris">
          En ce moment
        </h2>
        <p className="font-bold">
          {alertes.enAttente === 0
            ? "Aucune alerte en attente dans la zone."
            : `${alertes.enAttente} alerte${alertes.enAttente > 1 ? "s" : ""} en attente${
                retard ? `, dont ${alertes.enRetard} en retard (la plus ancienne depuis ${alertes.plusAncienneMinutes} min)` : ""
              }.`}
        </p>
      </div>
    </section>
  );
}
