/** Un chiffre clé d'un espace professionnel, avec ce qu'il compte en dessous. À placer dans une liste <dl>. */
export function Chiffre({ valeur, libelle, alerte = false }: { valeur: string; libelle: string; alerte?: boolean }) {
  return (
    <div className="rounded-carte bg-white px-4 py-3">
      <dt className="sr-only">{libelle}</dt>
      <dd className={`text-2xl font-bold tabular-nums ${alerte ? "text-soleil-fonce" : ""}`}>{valeur}</dd>
      <dd aria-hidden="true" className="text-sm text-gris">
        {libelle}
      </dd>
    </div>
  );
}
