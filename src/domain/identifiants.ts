import { z } from "zod";

const uuid = z.uuid();

/** Vrai pour un identifiant de la base : à vérifier avant toute requête sur une valeur venue d'un formulaire. */
export function estUuid(valeur: unknown): valeur is string {
  return uuid.safeParse(valeur).success;
}

/**
 * UUID version 7, créé sur le téléphone : l'instant d'abord (48 bits), puis du hasard.
 * Les saisies se rangent dans l'ordre et le serveur reconnaît une saisie déjà reçue.
 */
export function uuidV7(
  maintenant: number = Date.now(),
  aleatoire: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  const octets = aleatoire(16);
  for (let i = 0; i < 6; i++) octets[i] = Math.floor(maintenant / 2 ** (8 * (5 - i))) % 256;
  octets[6] = (octets[6]! & 0x0f) | 0x70;
  octets[8] = (octets[8]! & 0x3f) | 0x80;
  const hex = Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
