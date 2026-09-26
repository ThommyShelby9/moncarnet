import { INDICATEURS, lireIndicateur, type CodeIndicateur, type Comptage, type Niveau } from "@/domain/pilotage";
import { Icone } from "@/ui/Icone";

export const STYLE_NIVEAU: Record<Niveau, { texte: string; badge: string; barre: string; libelle: string }> = {
  bon: { texte: "text-marque", badge: "bg-lavande-2 text-marque", barre: "bg-marque", libelle: "Objectif atteint" },
  moyen: { texte: "text-soleil-appuye", badge: "bg-soleil-pale text-nuit", barre: "bg-soleil", libelle: "Presque" },
  faible: { texte: "text-urgence", badge: "bg-urgence-pale text-urgence", barre: "bg-urgence", libelle: "À appuyer" },
};

/** Un indicateur : sa valeur, son objectif, et l'écart avec le mois dernier. */
export function CarteIndicateur({ code, comptage, precedent }: { code: CodeIndicateur; comptage: Comptage; precedent?: Comptage }) {
  const d = INDICATEURS[code];
  const lecture = lireIndicateur(code, comptage);
  const avant = precedent ? lireIndicateur(code, precedent) : null;
  const ecart = lecture.valeur !== null && avant?.valeur != null && d.unite !== "nombre" ? lecture.valeur - avant.valeur : null;
  const mieux = ecart !== null && (d.unite === "minutes" ? ecart < 0 : ecart > 0);
  const style = lecture.niveau ? STYLE_NIVEAU[lecture.niveau] : null;
  const unite = d.unite === "minutes" ? " min" : " points";
  return (
    <article className="flex flex-col gap-2 rounded-carte bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm leading-snug font-bold text-gris">{d.court}</h3>
        {style && <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${style.badge}`}>{style.libelle}</span>}
      </div>
      {lecture.masque ? (
        <p className="flex items-center gap-2 text-2xl font-bold text-gris">
          <Icone nom="ph-shield-check" className="size-7" />
          Masqué
        </p>
      ) : (
        <p className={`text-3xl font-bold ${style?.texte ?? "text-nuit"}`}>{lecture.texte}</p>
      )}
      {d.unite === "pourcent" && lecture.valeur !== null && (
        <div className="relative h-2 rounded-full bg-lavande-2">
          <div className={`h-2 rounded-full ${style?.barre ?? "bg-marque"}`} style={{ width: `${Math.min(100, lecture.valeur)}%` }} />
          <span className="absolute -top-1 h-4 w-0.5 bg-nuit" style={{ left: `${d.cible}%` }} title={`Objectif ${d.cible} %`} />
        </div>
      )}
      <p className="text-xs text-gris">
        {lecture.masque || lecture.valeur === null || d.unite === "nombre"
          ? lecture.detail
          : `${lecture.detail} · objectif ${d.unite === "minutes" ? `${d.cible} min au plus` : `${d.cible} %`}`}
      </p>
      {ecart !== null && ecart !== 0 && (
        <p className={`flex items-center gap-1 text-xs font-bold ${mieux ? "text-marque" : "text-urgence"}`}>
          <Icone nom={ecart > 0 ? "ph-trend-up" : "ph-trend-down"} className="size-4" />
          {ecart > 0 ? "+" : ""}
          {ecart}
          {unite}
        </p>
      )}
    </article>
  );
}
