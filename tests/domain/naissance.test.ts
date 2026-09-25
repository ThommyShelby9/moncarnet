import { describe, expect, it } from "vitest";
import { lireDeclarationNaissance } from "@/domain/naissance";

const maintenant = new Date("2026-09-26T10:00:00Z");
const base = { date: "2026-09-26", heure: "06:40", lieu: "centre", mode: "voie_basse", sexe: "F", prenom: "", poids: "3,2", vaccins: "on" };

describe("lireDeclarationNaissance", () => {
  it("lit l'heure du Bénin, le poids en kilos, les vaccins faits", () => {
    expect(lireDeclarationNaissance(base, maintenant)).toEqual({
      ok: true,
      saisie: { le: new Date("2026-09-26T05:40:00Z"), lieu: "centre", mode: "voie_basse", sexe: "F", prenom: null, poidsGrammes: 3200, vaccinsNaissance: true },
    });
  });

  it("accepte le poids en grammes et un prénom", () => {
    expect(lireDeclarationNaissance({ ...base, poids: "2950", prenom: " Sènami ", vaccins: undefined }, maintenant)).toMatchObject({
      ok: true,
      saisie: { poidsGrammes: 2950, prenom: "Sènami", vaccinsNaissance: false },
    });
  });

  it("explique ce qui ne va pas", () => {
    expect(lireDeclarationNaissance({ ...base, heure: "14:00" }, maintenant)).toEqual({ ok: false, message: "L'heure de naissance est dans le futur." });
    expect(lireDeclarationNaissance({ ...base, poids: "" }, maintenant)).toEqual({ ok: false, message: "Indiquez le poids du bébé, par exemple 3,2 kg." });
    expect(lireDeclarationNaissance({ ...base, poids: "12" }, maintenant)).toEqual({ ok: false, message: "Indiquez le poids du bébé, par exemple 3,2 kg." });
    expect(lireDeclarationNaissance({ ...base, sexe: "" }, maintenant)).toEqual({ ok: false, message: "Vérifiez : le sexe." });
    expect(lireDeclarationNaissance({ ...base, date: "2026-07-01" }, maintenant)).toEqual({ ok: false, message: "La naissance date de plus de 30 jours : voyez l'état civil." });
  });
});
