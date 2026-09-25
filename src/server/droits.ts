import type { RoleCompte } from "./db/schema";

const ACCUEILS: Record<RoleCompte, string> = {
  patient: "/",
  relais: "/relais",
  soignant: "/soignant",
  pharmacie: "/pharmacie",
  pilotage: "/pilotage",
  admin: "/admin",
};

export function accueilDuRole(role: RoleCompte): string {
  return ACCUEILS[role];
}
