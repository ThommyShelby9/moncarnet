/** Code de retrait d'une ordonnance, lisible de loin et facile à recopier. */
export function CodeRetrait({ code, libelle = "Code de retrait" }: { code: string; libelle?: string }) {
  return (
    <p className="inline-flex flex-col rounded-carte bg-lavande-2 px-5 py-3 text-marque">
      <small className="text-xs font-bold text-gris">{libelle}</small>
      <b className="text-3xl tracking-[0.25em] tabular-nums">{code}</b>
    </p>
  );
}
