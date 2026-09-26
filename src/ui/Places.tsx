/** Les places d'une plage en pastilles : prises en indigo, libres en lavande (12 au plus, le nombre est écrit à côté). */
export function Places({ prises, capacite }: { prises: number; capacite: number }) {
  return (
    <span aria-hidden="true" className="flex flex-wrap gap-[3px]">
      {Array.from({ length: Math.min(capacite, 12) }, (_, i) => (
        <i key={i} className={`size-2.5 animate-fondu rounded-full ${i < Math.min(prises, 12) ? "bg-marque" : "bg-lavande-3"}`} style={{ animationDelay: `${150 + i * 45}ms` }} />
      ))}
    </span>
  );
}
