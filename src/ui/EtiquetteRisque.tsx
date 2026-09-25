type Niveau = "normal" | "surveillance" | "eleve";

const LIBELLES: Record<Niveau, string> = {
  normal: "Normal",
  surveillance: "À surveiller",
  eleve: "Élevé",
};

const STYLES: Record<Niveau, string> = {
  normal: "bg-lavande-2 text-gris",
  surveillance: "bg-soleil text-nuit",
  eleve: "bg-urgence text-white",
};

export function EtiquetteRisque({ niveau }: { niveau: Niveau }) {
  return (
    <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold whitespace-nowrap ${STYLES[niveau]}`}>
      {LIBELLES[niveau]}
    </span>
  );
}
