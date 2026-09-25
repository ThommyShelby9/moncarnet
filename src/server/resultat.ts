/** Résultat d'une action métier : un refus attendu n'est jamais une exception (spec §10.4). */
export type Resultat<T, E extends string> = { ok: true; donnees: T } | { ok: false; erreur: E };

export function reussite<T>(donnees: T): { ok: true; donnees: T } {
  return { ok: true, donnees };
}

export function echec<E extends string>(erreur: E): { ok: false; erreur: E } {
  return { ok: false, erreur };
}
