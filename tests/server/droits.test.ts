import { describe, expect, it } from "vitest";
import { accueilDuRole } from "@/server/droits";

describe("accueilDuRole", () => {
  it.each([
    ["patient", "/"],
    ["relais", "/relais"],
    ["soignant", "/soignant"],
    ["pharmacie", "/pharmacie"],
    ["pilotage", "/pilotage"],
    ["admin", "/admin"],
  ] as const)("envoie %s vers %s", (role, chemin) => {
    expect(accueilDuRole(role)).toBe(chemin);
  });
});
