import { INDICATEURS, lireIndicateur, type CodeIndicateur, type Comptage } from "@/domain/pilotage";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const LARGEUR = 560;
const HAUTEUR = 180;

/** La tendance sur 6 mois ; la ligne pointillée est l'objectif. */
export function CourbeIndicateur({ code, points }: { code: CodeIndicateur; points: { mois: string; comptage: Comptage }[] }) {
  const d = INDICATEURS[code];
  const lus = points.map((p) => ({ mois: p.mois, valeur: lireIndicateur(code, p.comptage).valeur }));
  const valeurs = lus.flatMap((p) => (p.valeur === null ? [] : [p.valeur]));
  if (valeurs.length < 2) return <p className="rounded-carte bg-white p-4 text-sm text-gris">Pas assez de mois pour une tendance.</p>;
  // Échelle resserrée autour des valeurs et de l'objectif : les écarts de quelques points se voient.
  const bornes = [...valeurs, d.cible ?? valeurs[0]!];
  const bas = Math.max(0, Math.min(...bornes) - 12);
  const haut = d.unite === "pourcent" ? Math.min(100, Math.max(...bornes) + 8) : Math.max(...bornes) * 1.15;
  const x = (i: number) => 40 + (i * (LARGEUR - 60)) / (lus.length - 1);
  const y = (v: number) => HAUTEUR - 28 - ((v - bas) / (haut - bas || 1)) * (HAUTEUR - 48);
  const trace = lus.flatMap((p, i) => (p.valeur === null ? [] : [`${x(i)},${y(p.valeur)}`])).join(" ");
  const resume = `${d.libelle} : ${lus.map((p) => `${MOIS[Number(p.mois.slice(5, 7)) - 1]} ${p.valeur ?? "masqué"}`).join(", ")}.`;
  return (
    <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="img" aria-label={resume} className="w-full rounded-carte bg-white p-2">
      {d.cible !== undefined && (
        <g>
          <line x1={40} x2={LARGEUR - 20} y1={y(d.cible)} y2={y(d.cible)} className="stroke-nuit" strokeDasharray="5 4" strokeWidth="1" />
          <text x={4} y={y(d.cible) + 4} className="fill-nuit text-[11px] font-bold">
            {d.cible}
          </text>
        </g>
      )}
      <polyline points={trace} fill="none" className="animate-tracer stroke-marque" strokeWidth="3" strokeLinejoin="round" pathLength={1} strokeDasharray="1" />
      {lus.map((p, i) =>
        p.valeur === null ? null : (
          <g key={p.mois} className="animate-fondu" style={{ animationDelay: `${300 + i * 150}ms` }}>
            <circle cx={x(i)} cy={y(p.valeur)} r="5" className="fill-marque" />
            <text x={x(i)} y={y(p.valeur) - 10} textAnchor="middle" className="fill-nuit text-[11px] font-bold">
              {p.valeur}
            </text>
          </g>
        ),
      )}
      {lus.map((p, i) => (
        <text key={`m-${p.mois}`} x={x(i)} y={HAUTEUR - 6} textAnchor="middle" className="fill-gris text-[11px]">
          {MOIS[Number(p.mois.slice(5, 7)) - 1]}
        </text>
      ))}
    </svg>
  );
}
