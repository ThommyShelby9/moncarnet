import { exigerRole } from "@/server/auth/cookies";

/** Session d'un soignant rattaché à un centre de santé : ses droits en dépendent (spec §12). */
export async function exigerSoignant() {
  const compte = await exigerRole("soignant");
  if (!compte.etablissementId) throw new Error("Ce compte soignant n'est rattaché à aucun centre de santé.");
  return { ...compte, etablissementId: compte.etablissementId };
}
