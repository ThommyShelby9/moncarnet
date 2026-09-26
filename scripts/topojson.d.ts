// Déclarations minimales des outils topojson (utilisés seulement par scripts/construire-carte.ts).
declare module "topojson-client";
declare module "topojson-server";
declare module "topojson-simplify";
declare module "topojson-specification" {
  export type Topology = { arcs: unknown[]; objects: Record<string, unknown> };
  export type GeometryCollection<P = unknown> = { type: "GeometryCollection"; geometries: { properties?: P }[] };
}
