import Link from "next/link";
import { CODES_INDICATEURS, INDICATEURS, lireIndicateur, type Valeurs } from "@/domain/pilotage";
import { STYLE_NIVEAU } from "./CarteIndicateur";

/** Les communes de la zone (ou les zones du pays) côte à côte ; un chiffre sur moins de 5 personnes reste masqué. */
export function TableauCommunes({
  lignes,
  entete = "Commune",
  lien,
}: {
  lignes: { nom: string; valeurs: Valeurs; total?: boolean; note?: string }[];
  entete?: string;
  lien?: (nom: string) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-carte bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-xs text-gris">
            <th className="p-3 font-bold">{entete}</th>
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
                {lien && !l.total ? (
                  <Link href={lien(l.nom)} className="underline decoration-lavande-4 underline-offset-2">
                    {l.nom}
                  </Link>
                ) : (
                  l.nom
                )}
                {l.note && <small className="block text-xs font-normal text-gris">{l.note}</small>}
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
