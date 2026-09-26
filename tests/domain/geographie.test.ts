import { describe, expect, it } from "vitest";
import { CARTE, projeter } from "@/domain/carte-benin";
import { COMMUNES, sansAccents, slugZone, ZONES_SANITAIRES, zoneDuSlug, zonesDeLaCommune } from "@/domain/geographie";

describe("zones sanitaires du Bénin", () => {
  it("compte 34 zones et 77 communes ; hors Cotonou, chaque commune est dans une seule zone", () => {
    expect(ZONES_SANITAIRES).toHaveLength(34);
    expect(COMMUNES).toHaveLength(77);
    const vues = ZONES_SANITAIRES.flatMap((z) => z.communes.map((c) => c.nom));
    expect(new Set(vues).size).toBe(77);
    expect(vues.filter((c) => c !== "Cotonou")).toHaveLength(76);
    expect(zonesDeLaCommune("Cotonou")).toHaveLength(4);
  });

  it("met Cotonou dans ses quatre zones et la zone de la démo sur ses trois communes", () => {
    expect(ZONES_SANITAIRES.filter((z) => z.departement === "Littoral").map((z) => z.zone)).toEqual(["Cotonou 1-4", "Cotonou 2-3", "Cotonou 5", "Cotonou 6"]);
    expect(zonesDeLaCommune("Bohicon").map((z) => z.zone)).toEqual(["Zogbodomey-Bohicon-Zakpota"]);
    expect(ZONES_SANITAIRES.find((z) => z.zone === "Zogbodomey-Bohicon-Zakpota")!.communes.map((c) => c.nom)).toEqual(["Zogbodomey", "Bohicon", "Za-Kpota"]);
  });

  it("retrouve une commune sans tenir compte des accents", () => {
    expect(sansAccents("Sèmè-Kpodji")).toBe("seme-kpodji");
    expect(zonesDeLaCommune("Dassa-Zoume").map((z) => z.zone)).toEqual(["Dassa-Zoumè / Glazoué"]);
  });
});

describe("fond de carte", () => {
  it("a un tracé pour chaque commune et chaque zone", () => {
    expect(CARTE.communes.map((c) => c.nom).sort()).toEqual(COMMUNES.map((c) => c.nom).sort());
    expect(CARTE.communes.every((c) => /^M[\d.]+ [\d.]+/.test(c.d))).toBe(true);
    const zonesTracees = new Set(CARTE.zones.flatMap((z) => z.membres));
    expect(ZONES_SANITAIRES.every((z) => zonesTracees.has(z.zone))).toBe(true);
    expect(CARTE.zones.find((z) => z.zone === "Cotonou")!.membres).toHaveLength(4);
    expect(CARTE.departements).toHaveLength(12);
    expect(CARTE.frontieresZones).toMatch(/^M/);
    expect(CARTE.frontieresDepartements).toMatch(/^M/);
  });

  it("projette Bohicon dans la boîte de sa commune", () => {
    const [x, y] = projeter(2.0667, 7.1775);
    const [x0, y0, x1, y1] = CARTE.communes.find((c) => c.nom === "Bohicon")!.boite;
    expect(x).toBeGreaterThanOrEqual(x0);
    expect(x).toBeLessThanOrEqual(x1);
    expect(y).toBeGreaterThanOrEqual(y0);
    expect(y).toBeLessThanOrEqual(y1);
  });

  it("reste léger", () => {
    expect(JSON.stringify(CARTE).length).toBeLessThan(90_000);
  });
});

describe("adresse d'une zone", () => {
  it("n'a ni barre oblique, ni accent, ni espace : le proxy refuse les %2F", () => {
    expect(slugZone("Kandi / Gogounou / Ségbana")).toBe("kandi-gogounou-segbana");
    expect(slugZone("Parakou / N'Dali")).toBe("parakou-n-dali");
    expect(ZONES_SANITAIRES.every((z) => /^[a-z0-9-]+$/.test(slugZone(z.zone)))).toBe(true);
  });

  it("est unique et retrouve sa zone", () => {
    const slugs = ZONES_SANITAIRES.map((z) => slugZone(z.zone));
    expect(new Set(slugs).size).toBe(34);
    for (const z of ZONES_SANITAIRES) expect(zoneDuSlug(slugZone(z.zone))?.zone).toBe(z.zone);
    expect(zoneDuSlug("cotonou-2-3")?.zone).toBe("Cotonou 2-3");
    expect(zoneDuSlug("inconnue")).toBeUndefined();
  });
});
