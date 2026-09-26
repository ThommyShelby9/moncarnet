// Fabrique src/domain/carte-benin.ts à partir des communes de geoBoundaries (domaine public) :
// topologie (les frontières partagées restent communes), simplification, projection, tracés SVG.
// Lancer : pnpm exec tsx scripts/construire-carte.ts
import { readFileSync, writeFileSync } from "node:fs";
import { feature, merge, mesh } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";
import type { GeometryCollection, Topology } from "topojson-specification";
import { COMMUNES, sansAccents, ZONES_SANITAIRES } from "../src/domain/geographie";

type Position = [number, number];
type Anneau = Position[];
type Polygone = Anneau[];

const source = JSON.parse(readFileSync("data/geo/communes-benin.geojson", "utf8")) as {
  features: { properties: { shapeName: string }; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown } }[];
};
const nomDe = new Map(COMMUNES.map((c) => [c.source, c.nom]));
const features = source.features.map((f) => {
  const nom = nomDe.get(sansAccents(f.properties.shapeName));
  if (!nom) throw new Error(`Commune inconnue dans le fond de carte : ${f.properties.shapeName}`);
  return { type: "Feature" as const, properties: { nom }, geometry: f.geometry };
});

const brute = topology({ communes: { type: "FeatureCollection", features } } as never, 1e5) as Topology;
const PART_GARDEE = Number(process.env.PART_GARDEE ?? 0.3);
// quantile(p) donne le poids au-dessus duquel reste environ la part p des points.
const pre = presimplify(brute as never);
const topo = simplify(pre, quantile(pre, PART_GARDEE)) as Topology;
const collection = topo.objects.communes as GeometryCollection<{ nom: string }>;

// Projection équirectangulaire corrigée à la latitude moyenne du pays (9,3° N).
const tous = (feature(topo, collection) as unknown as { features: { geometry: { coordinates: unknown } }[] }).features.flatMap((f) =>
  (JSON.stringify(f.geometry.coordinates).match(/-?\d+\.?\d*,-?\d+\.?\d*/g) ?? []).map((p) => p.split(",").map(Number) as Position),
);
const LON_MIN = Math.min(...tous.map((p) => p[0]));
const LON_MAX = Math.max(...tous.map((p) => p[0]));
const LAT_MIN = Math.min(...tous.map((p) => p[1]));
const LAT_MAX = Math.max(...tous.map((p) => p[1]));
const COS = Math.cos((((LAT_MIN + LAT_MAX) / 2) * Math.PI) / 180);
const ECHELLE = 100;
const MARGE = 4;
const arrondi = (v: number) => Math.round(v * 10) / 10;
const projeter = ([lon, lat]: Position): Position => [arrondi(MARGE + (lon - LON_MIN) * ECHELLE * COS), arrondi(MARGE + (LAT_MAX - lat) * ECHELLE)];
const LARGEUR = Math.ceil(2 * MARGE + (LON_MAX - LON_MIN) * ECHELLE * COS);
const HAUTEUR = Math.ceil(2 * MARGE + (LAT_MAX - LAT_MIN) * ECHELLE);

const polygones = (g: { type: string; coordinates: unknown }): Polygone[] =>
  g.type === "Polygon" ? [g.coordinates as Polygone] : g.type === "MultiPolygon" ? (g.coordinates as Polygone[]) : [];

const nombre = (v: number) => String(v);
function trace(polys: Polygone[]): string {
  return polys
    .map((poly) =>
      poly
        .map((anneau) => {
          const points = anneau.map(projeter).filter((p, i, t) => i === 0 || p[0] !== t[i - 1]![0] || p[1] !== t[i - 1]![1]);
          return points.length < 3 ? "" : `M${points.map((p) => `${nombre(p[0])} ${nombre(p[1])}`).join("L")}Z`;
        })
        .join(""),
    )
    .join("");
}

function traceLignes(g: { type: string; coordinates: unknown }): string {
  const lignes = g.type === "LineString" ? [g.coordinates as Position[]] : (g.coordinates as Position[][]);
  return lignes
    .map((l) => {
      const points = l.map(projeter).filter((p, i, t) => i === 0 || p[0] !== t[i - 1]![0] || p[1] !== t[i - 1]![1]);
      return points.length < 2 ? "" : `M${points.map((p) => `${nombre(p[0])} ${nombre(p[1])}`).join("L")}`;
    })
    .join("");
}

function aireEtCentre(anneau: Position[]): { aire: number; centre: Position } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < anneau.length - 1; i++) {
    const [x0, y0] = anneau[i]!;
    const [x1, y1] = anneau[i + 1]!;
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a /= 2;
  return a === 0 ? { aire: 0, centre: anneau[0]! } : { aire: Math.abs(a), centre: [arrondi(cx / (6 * a)), arrondi(cy / (6 * a))] };
}

function mesures(polys: Polygone[]) {
  const projetes = polys.map((p) => p[0]!.map(projeter));
  const parts = projetes.map(aireEtCentre);
  const principale = parts.reduce((m, p) => (p.aire > m.aire ? p : m), parts[0]!);
  const points = projetes.flat();
  return {
    centre: principale.centre,
    aire: Math.round(parts.reduce((s, p) => s + p.aire, 0)),
    boite: [
      Math.min(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
      Math.max(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1])),
    ] as [number, number, number, number],
  };
}

const geometries = collection.geometries;
const communes = (feature(topo, collection) as unknown as { features: { properties: { nom: string }; geometry: { type: string; coordinates: unknown } }[] }).features
  .map((f) => {
    const polys = polygones(f.geometry);
    return { nom: f.properties.nom, d: trace(polys), ...mesures(polys) };
  })
  .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

const fusion = (noms: string[]) => {
  const g = merge(topo as never, geometries.filter((x) => noms.includes(x.properties!.nom)) as never) as { type: string; coordinates: unknown };
  return mesures(polygones(g));
};
const zoneDe = new Map(ZONES_SANITAIRES.flatMap((z) => z.communes.map((c) => [c.nom, z.departement === "Littoral" ? "Cotonou" : z.zone] as const)));
const departementDe = new Map(ZONES_SANITAIRES.flatMap((z) => z.communes.map((c) => [c.nom, z.departement] as const)));
type Geo = { properties?: { nom: string } };
const frontieres = (cle: Map<string, string>) =>
  traceLignes(mesh(topo as never, collection as never, ((a: Geo, b: Geo) => a !== b && cle.get(a.properties!.nom) !== cle.get(b.properties!.nom)) as never) as never);

// Une entrée par groupe de communes : les quatre zones de Cotonou partagent la même commune.
const groupes = new Map<string, { zone: string; membres: string[]; communes: string[] }>();
for (const z of ZONES_SANITAIRES) {
  const cle = z.communes.map((c) => c.nom).join("|");
  const g = groupes.get(cle);
  if (g) g.membres.push(z.zone);
  else groupes.set(cle, { zone: z.departement === "Littoral" ? "Cotonou" : z.zone, membres: [z.zone], communes: z.communes.map((c) => c.nom) });
}
const zones = [...groupes.values()].map((g) => ({ zone: g.zone, membres: g.membres, communes: g.communes, ...fusion(g.communes) }));
const departements = [...new Set(ZONES_SANITAIRES.map((z) => z.departement))].map((departement) => ({
  departement,
  centre: fusion([...new Set(ZONES_SANITAIRES.filter((z) => z.departement === departement).flatMap((z) => z.communes.map((c) => c.nom)))]).centre,
}));

const carte = {
  largeur: LARGEUR,
  hauteur: HAUTEUR,
  communes,
  zones,
  departements,
  frontieresZones: frontieres(zoneDe),
  frontieresDepartements: frontieres(departementDe),
  contour: traceLignes(mesh(topo as never, collection as never, ((a: Geo, b: Geo) => a === b) as never) as never),
};
const sortie = `// Fichier généré par scripts/construire-carte.ts : ne pas modifier à la main.
// Fond de carte : communes du Bénin, geoBoundaries gbOpen BEN ADM2 (domaine public, Map Maker Ltd. / Stanford Earthworks).

export interface Emprise {
  /** Point où écrire l'étiquette (centre de la plus grande partie). */
  centre: [number, number];
  aire: number;
  boite: [number, number, number, number];
}

export const CARTE: {
  largeur: number;
  hauteur: number;
  communes: (Emprise & { nom: string; d: string })[];
  /** Les quatre zones de Cotonou partagent une commune : une seule entrée « Cotonou ». */
  zones: (Emprise & { zone: string; membres: string[]; communes: string[] })[];
  departements: { departement: string; centre: [number, number] }[];
  /** Frontières entre zones, entre départements, et contour du pays (lignes). */
  frontieresZones: string;
  frontieresDepartements: string;
  contour: string;
} = ${JSON.stringify(carte)};

/** Longitude et latitude vers les coordonnées de la carte (mêmes réglages que les tracés). */
export function projeter(lon: number, lat: number): [number, number] {
  return [
    Math.round((${MARGE} + (lon - ${LON_MIN}) * ${ECHELLE * COS}) * 10) / 10,
    Math.round((${MARGE} + (${LAT_MAX} - lat) * ${ECHELLE}) * 10) / 10,
  ];
}
`;
writeFileSync("src/domain/carte-benin.ts", sortie);
console.log(`${communes.length} communes, ${zones.length} zones, ${departements.length} départements ; ${LARGEUR}×${HAUTEUR} ; ${Math.round(JSON.stringify(carte).length / 1024)} Ko`);
