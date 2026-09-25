import type { StatutEtape } from "@/domain/statuts";

export interface Repere {
  code: string;
  libelle: string;
  semaine: number;
  statut: StatutEtape;
}

const STATUT: Record<StatutEtape, string> = { faite: "faite", a_venir: "à venir", manquee: "manquée" };
const POINT: Record<StatutEtape, string> = {
  faite: "bg-marque border-marque",
  a_venir: "bg-white border-marque border-dashed",
  manquee: "bg-soleil border-soleil-appuye",
};
const pourcent = (semaine: number) => `${Math.min(100, (semaine / 40) * 100)}%`;

/** Les 40 semaines en trois trimestres : où en est la grossesse, et chaque consultation à sa place. */
export function FriseGrossesse({ semaines, reperes }: { semaines: number; reperes: Repere[] }) {
  const resume = [`Semaine ${semaines} sur 40.`, ...reperes.map((r) => `${r.libelle} : ${STATUT[r.statut]}.`)].join(" ");
  return (
    <div role="img" aria-label={resume} className="rounded-carte bg-white px-4 pt-4 pb-3">
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-7 flex h-3 overflow-hidden rounded-full">
          <span className="w-[35%] bg-lavande-3" />
          <span className="w-[35%] bg-lavande-4" />
          <span className="flex-1 bg-lavande-5" />
        </div>
        <div className="absolute top-7 h-3 rounded-full bg-marque/25" style={{ width: pourcent(semaines) }} />
        {reperes.map((r) => (
          <span
            key={r.code}
            className={`absolute top-[22px] size-[22px] -translate-x-1/2 rounded-full border-[3px] ${POINT[r.statut]}`}
            style={{ left: pourcent(r.semaine) }}
          />
        ))}
        <span className="absolute top-0 -translate-x-1/2 rounded-md bg-soleil px-1.5 text-xs font-bold text-nuit" style={{ left: pourcent(semaines) }}>
          {semaines} sem.
        </span>
      </div>
      <div className="mt-1 grid grid-cols-[35%_35%_1fr] text-xs font-bold text-gris">
        <span>1ᵉʳ trimestre</span>
        <span>2ᵉ trimestre</span>
        <span className="text-right">3ᵉ trimestre</span>
      </div>
    </div>
  );
}
