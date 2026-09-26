import { describe, expect, it } from "vitest";
import { agreger, lignesDe, lireIndicateur, moisPrecedents, premierDuMois, versCsv, vide } from "@/domain/pilotage";

describe("lireIndicateur", () => {
  it("masque un taux qui porte sur moins de 5 personnes", () => {
    expect(lireIndicateur("cpn4", { numerateur: 3, denominateur: 4 })).toEqual({
      valeur: null,
      texte: "Masqué",
      detail: "Moins de 5 personnes : chiffre masqué",
      masque: true,
      niveau: null,
    });
  });

  it("dit si l'objectif est atteint, presque atteint, ou s'il faut appuyer", () => {
    expect(lireIndicateur("cpn4", { numerateur: 6, denominateur: 10 })).toEqual({ valeur: 60, texte: "60 %", detail: "6 sur 10", masque: false, niveau: "bon" });
    expect(lireIndicateur("cpn4", { numerateur: 5, denominateur: 10 }).niveau).toBe("moyen");
    expect(lireIndicateur("cpn4", { numerateur: 3, denominateur: 10 }).niveau).toBe("faible");
  });

  it("lit un délai en minutes : plus il est court, mieux c'est", () => {
    expect(lireIndicateur("alertes_delai", { numerateur: 60, denominateur: 6 })).toMatchObject({ valeur: 10, texte: "10 min", detail: "6 alertes", niveau: "bon" });
    expect(lireIndicateur("alertes_delai", { numerateur: 130, denominateur: 6 }).niveau).toBe("moyen");
    expect(lireIndicateur("alertes_delai", { numerateur: 200, denominateur: 6 }).niveau).toBe("faible");
  });

  it("donne un simple nombre pour les visites, et « — » quand il n'y a aucune donnée", () => {
    expect(lireIndicateur("visites_relais", { numerateur: 12, denominateur: 0 })).toMatchObject({ valeur: 12, texte: "12", masque: false });
    expect(lireIndicateur("penta3", { numerateur: 0, denominateur: 0 })).toMatchObject({ valeur: null, texte: "—", detail: "Aucune donnée pour la période" });
  });
});

describe("agreger et exporter", () => {
  it("additionne les communes pour faire la zone", () => {
    const a = { ...vide(), cpn4: { numerateur: 2, denominateur: 3 } };
    const b = { ...vide(), cpn4: { numerateur: 3, denominateur: 4 } };
    expect(agreger([a, b]).cpn4).toEqual({ numerateur: 5, denominateur: 7 });
  });

  it("exporte au format de DHIS2, sans les chiffres masqués", () => {
    const valeurs = { ...vide(), cpn4: { numerateur: 6, denominateur: 10 }, penta3: { numerateur: 2, denominateur: 3 } };
    const csv = versCsv(lignesDe("Zone ; test", valeurs, "202609").filter((l) => l.code === "cpn4" || l.code === "penta3"));
    expect(csv).toBe('orgUnit;period;dataElement;numerator;denominator;value\n"Zone ; test";202609;cpn4;6;10;60\n"Zone ; test";202609;penta3;;;\n');
  });
});

describe("mois", () => {
  it("compte les mois sans en sauter, même autour de février", () => {
    expect(premierDuMois("2026-09-26")).toBe("2026-09-01");
    expect(moisPrecedents("2026-03-01", 3)).toEqual(["2025-12-01", "2026-01-01", "2026-02-01"]);
    expect(moisPrecedents("2026-09-01", 5)).toEqual(["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01"]);
  });
});
