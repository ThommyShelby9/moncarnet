import { describe, expect, it } from "vitest";
import { heureBenin, lireConnexionPatient, lireConnexionPersonnel, messageEchec } from "@/app/connexion/formulaires";

const formulaire = (valeurs: Record<string, string>) => {
  const fd = new FormData();
  for (const [cle, valeur] of Object.entries(valeurs)) fd.set(cle, valeur);
  return fd;
};

describe("lireConnexionPatient", () => {
  it("normalise le numéro", () => {
    expect(lireConnexionPatient(formulaire({ telephone: "01 97 00 00 01", code: "1234" }))).toEqual({
      ok: true,
      identifiant: "+2290197000001",
      code: "1234",
    });
  });

  it("explique un code incomplet", () => {
    expect(lireConnexionPatient(formulaire({ telephone: "0197000001", code: "12" }))).toEqual({
      ok: false,
      message: "Le code doit avoir 4 chiffres.",
    });
  });

  it("explique un numéro qui n'est pas béninois", () => {
    expect(lireConnexionPatient(formulaire({ telephone: "+33 6 12 34 56 78", code: "1234" }))).toEqual({
      ok: false,
      message: "Ce numéro n'est pas un numéro béninois valide.",
    });
  });
});

describe("lireConnexionPersonnel", () => {
  it("met l'identifiant en minuscules", () => {
    expect(lireConnexionPersonnel(formulaire({ identifiant: " Adjoa.Gbaguidi ", motDePasse: "demo1234" }))).toEqual({
      ok: true,
      identifiant: "adjoa.gbaguidi",
      motDePasse: "demo1234",
    });
  });
});

describe("messages d'échec", () => {
  it("donne l'heure du Bénin pour un compte verrouillé", () => {
    expect(heureBenin(new Date("2026-09-25T13:32:00Z"))).toBe("14 h 32");
    expect(messageEchec("verrouille", new Date("2026-09-25T13:32:00Z"), "patient")).toBe(
      "Trop d'essais. Vous pourrez réessayer à 14 h 32.",
    );
  });

  it("ne dit pas si c'est le numéro ou le code qui est faux", () => {
    expect(messageEchec("identifiants", undefined, "patient")).toBe("Numéro ou code incorrect.");
    expect(messageEchec("identifiants", undefined, "personnel")).toBe("Identifiant ou mot de passe incorrect.");
  });
});
