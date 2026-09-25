import { describe, expect, it } from "vitest";
import {
  dateCourte,
  dateLongue,
  debutDuJourAuBenin,
  heureAuBenin,
  heureMinute,
  libelleDansJours,
  libelleJour,
  majuscule,
  moisEtAnnee,
  momentCommence,
  nombreDeSoleils,
  salutation,
} from "@/domain/temps";

describe("heure et jour au Bénin", () => {
  it("donne l'heure locale, à UTC+1", () => {
    expect(heureAuBenin(new Date("2026-09-25T19:02:00Z"))).toBe(20);
    expect(heureAuBenin(new Date("2026-09-25T23:30:00Z"))).toBe(0);
  });

  it("fait commencer la journée à minuit, heure du Bénin", () => {
    expect(debutDuJourAuBenin("2026-09-25").toISOString()).toBe("2026-09-24T23:00:00.000Z");
  });

  it("écrit l'heure à la française, à l'heure du Bénin", () => {
    expect(heureMinute(new Date("2026-09-25T08:41:00Z"))).toBe("9 h 41");
    expect(heureMinute(new Date("2026-09-25T19:05:00Z"))).toBe("20 h 05");
  });
});

describe("salutation et moments de prise", () => {
  it("dit bonjour le jour et bonsoir à partir de 17 h", () => {
    expect(salutation(10)).toBe("Bonjour");
    expect(salutation(17)).toBe("Bonsoir");
    expect(salutation(2)).toBe("Bonsoir");
  });

  it("attend la prise du soir à partir de 17 h", () => {
    expect(momentCommence("soir", 16)).toBe(false);
    expect(momentCommence("soir", 17)).toBe(true);
    expect(momentCommence("matin", 5)).toBe(true);
  });
});

describe("libellés de dates", () => {
  it("écrit la date en toutes lettres", () => {
    expect(dateLongue("2026-09-30")).toBe("mercredi 30 septembre");
    expect(dateLongue("2026-10-01")).toBe("jeudi 1er octobre");
    expect(dateCourte("2026-02-12")).toBe("12/02");
    expect(moisEtAnnee("2027-05-03")).toBe("mai 2027");
  });

  it.each([
    [0, "aujourd'hui"],
    [1, "demain"],
    [2, "dans 2 jours"],
    [6, "dans 6 jours"],
    [7, "dans 1 semaine"],
    [13, "dans 1 semaine"],
    [14, "dans 2 semaines"],
    [29, "dans 4 semaines"],
    [45, "dans 1 mois"],
    [95, "dans 3 mois"],
    [-1, "hier"],
    [-3, "il y a 3 jours"],
  ] as const)("%i jours : %s", (n, texte) => {
    expect(libelleDansJours(n)).toBe(texte);
  });

  it("nomme le jour : aujourd'hui, demain, le jour de la semaine, puis la date", () => {
    expect(libelleJour("2026-09-25", "2026-09-25")).toBe("Aujourd'hui");
    expect(libelleJour("2026-09-26", "2026-09-25")).toBe("Demain");
    expect(libelleJour("2026-09-30", "2026-09-25")).toBe("Mercredi");
    expect(libelleJour("2026-10-07", "2026-09-25")).toBe("Mercredi 7 octobre");
  });

  it("met un soleil par jour d'attente, jusqu'à 6", () => {
    expect(nombreDeSoleils(0)).toBe(0);
    expect(nombreDeSoleils(2)).toBe(2);
    expect(nombreDeSoleils(7)).toBe(0);
  });

  it("met une majuscule, accents compris", () => {
    expect(majuscule("écouter")).toBe("Écouter");
  });
});
