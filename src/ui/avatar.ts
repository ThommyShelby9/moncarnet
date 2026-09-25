import type { LienResponsable } from "@/server/db/schema";
import type { NomIcone } from "./icones";

export function iconePourPersonne(sexe: "F" | "M", age: number): NomIcone {
  if (age < 3) return "hi-baby-0306m";
  if (age < 13) return "hi-boy-0105y";
  if (age >= 65) return sexe === "F" ? "hi-old-woman" : "hi-elderly";
  return sexe === "F" ? "hi-woman" : "hi-man";
}

/** Relation vue par le titulaire du compte : « parent » = il est le parent de la personne. */
export function libelleLien(lien: LienResponsable, sexe: "F" | "M"): string {
  const f = sexe === "F";
  switch (lien) {
    case "soi":
      return "Moi";
    case "conjoint":
      return f ? "Ma femme" : "Mon mari";
    case "parent":
      return f ? "Ma fille" : "Mon fils";
    case "enfant":
      return f ? "Ma mère" : "Mon père";
    case "aidant":
      return "Je m'en occupe";
  }
}
