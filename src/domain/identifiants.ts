import { z } from "zod";

const uuid = z.uuid();

/** Vrai pour un identifiant de la base : à vérifier avant toute requête sur une valeur venue d'un formulaire. */
export function estUuid(valeur: unknown): valeur is string {
  return uuid.safeParse(valeur).success;
}
