import Link from "next/link";
import { lireIndicateur, type CodeIndicateur, type Valeurs } from "@/domain/pilotage";
import { STYLE_NIVEAU } from "./CarteIndicateur";

interface Zone {
  zone: string;
  departement: string;
  valeurs: Valeurs;
  direct: boolean;
}

/** Les zones rangées pour un indicateur : les mieux placées d'abord, les chiffres masqués ou absents à la fin. */
export function ClassementZones({ code, zones, lien }: { code: CodeIndicateur; zones: Zone[]; lien?: (zone: string) => string }) {
  const minutes = code === "alertes_delai";
  const lues = zones.map((z) => ({ ...z, lecture: lireIndicateur(code, z.valeurs[code]) }));
  const rang = (v: number | null) => (v === null ? Number.POSITIVE_INFINITY : minutes ? v : -v);
  lues.sort((a, b) => rang(a.lecture.valeur) - rang(b.lecture.valeur) || a.zone.localeCompare(b.zone, "fr"));
  const max = Math.max(1, ...lues.map((z) => z.lecture.valeur ?? 0));
  return (
    <ol className="flex flex-col gap-2">
      {lues.map((z) => {
        const style = z.lecture.niveau ? STYLE_NIVEAU[z.lecture.niveau] : null;
        const largeur = z.lecture.valeur === null ? 0 : minutes ? (z.lecture.valeur / max) * 100 : z.lecture.valeur;
        return (
          <li key={z.zone} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-3 sm:grid-cols-[minmax(0,16rem)_1fr_auto]">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">
                {lien ? (
                  <Link href={lien(z.zone)} className="underline decoration-lavande-4 underline-offset-2">
                    {z.zone}
                  </Link>
                ) : (
                  z.zone
                )}
              </h3>
              <p className="flex items-center gap-2 text-xs text-gris">
                {z.departement}
                {z.direct && <span className="rounded-md bg-soleil px-1.5 font-bold text-nuit">En direct</span>}
              </p>
            </div>
            <div className="col-span-2 h-2.5 rounded-full bg-lavande-2 sm:col-span-1">
              <div className={`h-2.5 rounded-full ${style?.barre ?? "bg-lavande-4"}`} style={{ width: `${Math.min(100, largeur)}%` }} />
            </div>
            <b className={`row-start-1 text-right sm:row-auto ${style?.texte ?? "text-gris"}`}>{z.lecture.texte}</b>
          </li>
        );
      })}
    </ol>
  );
}
