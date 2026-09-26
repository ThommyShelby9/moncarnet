import { describe, expect, it } from "vitest";
import { groupesDemo } from "@/app/demo/groupes";
import { COMPTES_DEMO } from "@/server/demo/donnees";

describe("groupesDemo", () => {
  it("met les deux parcours usagers en premier, puis les professionnels et l'État", () => {
    const groupes = groupesDemo(COMPTES_DEMO);
    expect(groupes.map((g) => g.titre)).toEqual(["Deux parcours à suivre", "Soignants, relais et pharmacie", "L'État", "Autres comptes"]);
    expect(groupes[0]!.comptes.map((c) => c.nomAffiche)).toEqual(["Awa Hounkpatin", "Codjo Houngbo"]);
    expect(groupes[1]!.comptes.map((c) => c.role)).toEqual(["soignant", "soignant", "relais", "pharmacie"]);
  });
});
