import { CODES_INDICATEURS, INDICATEURS, lireIndicateur, type Valeurs } from "@/domain/pilotage";
import { STYLE_NIVEAU } from "./CarteIndicateur";

/** Les communes de la zone côte à côte ; un chiffre sur moins de 5 personnes reste masqué. */
export function TableauCommunes({ lignes }: { lignes: { nom: string; valeurs: Valeurs; total?: boolean }[] }) {
  return (
    <div className="overflow-x-auto rounded-carte bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-xs text-gris">
            <th className="p-3 font-bold">Commune</th>
            {CODES_INDICATEURS.map((c) => (
              <th key={c} className="p-3 font-bold">
                {INDICATEURS[c].court}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.nom} className={`border-t border-lavande-2 ${l.total ? "bg-lavande font-bold" : ""}`}>
              <th scope="row" className="p-3 text-left font-bold">
                {l.nom}
              </th>
              {CODES_INDICATEURS.map((c) => {
                const lecture = lireIndicateur(c, l.valeurs[c]);
                return (
                  <td key={c} className={`p-3 ${lecture.niveau ? STYLE_NIVEAU[lecture.niveau].texte : "text-gris"}`} title={lecture.detail}>
                    {lecture.texte}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
