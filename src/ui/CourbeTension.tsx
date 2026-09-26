import type { DateISO } from "@/domain/dates";
import { dateCourte } from "@/domain/temps";

const LARGEUR = 320;
const HAUTEUR = 150;
const MARGE = 28;

/** Les derniers relevés de tension : le chiffre du haut en indigo, la limite 140/90 en pointillés rouges. */
export function CourbeTension({ releves }: { releves: { date: DateISO; sys: number; dia: number }[] }) {
  if (releves.length < 2) return null;
  // Échelle resserrée sur les relevés, en gardant toujours visibles les limites 90 et 140.
  const min = Math.min(80, ...releves.map((r) => r.dia)) - 10;
  const max = Math.max(150, ...releves.map((r) => r.sys)) + 10;
  const x = (i: number) => MARGE + (i * (LARGEUR - 2 * MARGE)) / (releves.length - 1);
  const y = (v: number) => HAUTEUR - 22 - ((v - min) * (HAUTEUR - 36)) / (max - min);
  const trop = (r: { sys: number; dia: number }) => r.sys >= 140 || r.dia >= 90;
  const derniere = releves[releves.length - 1]!;
  const resume = `Tension : ${releves.map((r) => `${r.sys}/${r.dia} le ${dateCourte(r.date)}`).join(", ")}. Trop haute au-dessus de 140/90.`;
  const ligne = (cle: "sys" | "dia") => releves.map((r, i) => `${x(i)},${y(r[cle])}`).join(" ");
  return (
    <figure className="flex flex-col gap-2 rounded-carte bg-white p-4">
      <figcaption className="flex items-baseline justify-between">
        <b className="text-lg">Ma tension</b>
        <span className={`text-lg font-bold ${trop(derniere) ? "text-urgence" : "text-marque"}`}>
          {derniere.sys}/{derniere.dia}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="img" aria-label={resume} className="w-full">
        {[140, 90].map((limite) => (
          <g key={limite}>
            <line x1={MARGE} x2={LARGEUR - MARGE} y1={y(limite)} y2={y(limite)} className="stroke-urgence" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={2} y={y(limite) + 4} className="fill-urgence text-[10px] font-bold">
              {limite}
            </text>
          </g>
        ))}
        <polyline points={ligne("dia")} fill="none" className="animate-tracer stroke-lavande-5" strokeWidth="2.5" strokeLinejoin="round" pathLength={1} strokeDasharray="1" />
        <polyline points={ligne("sys")} fill="none" className="animate-tracer stroke-marque" strokeWidth="3" strokeLinejoin="round" pathLength={1} strokeDasharray="1" />
        {releves.map((r, i) => (
          <circle key={r.date + i} cx={x(i)} cy={y(r.sys)} r="5" className={trop(r) ? "fill-urgence" : "fill-marque"} />
        ))}
        {[0, releves.length - 1].map((i) => (
          <text key={i} x={x(i)} y={HAUTEUR - 4} textAnchor="middle" className="fill-gris text-[10px]">
            {dateCourte(releves[i]!.date)}
          </text>
        ))}
      </svg>
      <p className="text-sm text-gris">Au-dessus des pointillés rouges (140/90), la tension est trop haute : prenez bien vos comprimés.</p>
    </figure>
  );
}
