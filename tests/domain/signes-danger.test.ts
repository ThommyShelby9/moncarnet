import { describe, expect, it } from "vitest";
import { echeanceAlerte } from "@/domain/alertes";
import { CODES_SIGNES, LIBELLES_SIGNES, signesProposes } from "@/domain/signes-danger";

describe("signesProposes", () => {
  it("propose à une femme enceinte le début du travail, puis les 8 pictogrammes de la spec, « autre » en dernier", () => {
    const signes = signesProposes({ enceinte: true, age: 24 });
    expect(signes).toEqual(["debut_travail", "saignement", "fievre", "maux_de_tete", "gonflement", "bebe_ne_bouge_plus", "perte_des_eaux", "douleur", "autre"]);
  });

  it("propose la diarrhée pour un jeune enfant, sans les signes de la grossesse", () => {
    const signes = signesProposes({ enceinte: false, age: 0 });
    expect(signes).toContain("diarrhee");
    expect(signes).not.toContain("perte_des_eaux");
    expect(signes).toHaveLength(6);
  });

  it("propose à un adulte la fièvre, la respiration et la douleur", () => {
    expect(signesProposes({ enceinte: false, age: 58 })).toEqual(["fievre", "respiration", "douleur", "saignement", "vomissements", "autre"]);
  });

  it("a un libellé pour chaque signe", () => {
    for (const code of CODES_SIGNES) expect(LIBELLES_SIGNES[code].length).toBeGreaterThan(3);
  });
});

describe("echeanceAlerte", () => {
  it("laisse 15 minutes pour prendre l'alerte en charge", () => {
    expect(echeanceAlerte(new Date("2026-09-25T19:14:00Z")).toISOString()).toBe("2026-09-25T19:29:00.000Z");
  });
});
