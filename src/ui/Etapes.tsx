/** Barre d'avancement d'un parcours : « 2 sur 4 ». */
export function Etapes({ numero, total }: { numero: number; total: number }) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <span
        role="progressbar"
        aria-label="Avancement"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={numero}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-lavande-3"
      >
        <span className="block h-full rounded-full bg-marque" style={{ width: `${(numero / total) * 100}%` }} />
      </span>
      <small className="text-xs font-bold whitespace-nowrap text-gris">
        {numero} sur {total}
      </small>
    </div>
  );
}
