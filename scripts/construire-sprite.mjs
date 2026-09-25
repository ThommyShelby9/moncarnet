import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dossier = "src/ui/icones/svg";
const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".svg")).sort();

const symboles = fichiers.map((fichier) => {
  const brut = readFileSync(join(dossier, fichier), "utf8");
  const viewBox = /viewBox="([^"]+)"/.exec(brut)?.[1] ?? "0 0 48 48";
  let interieur = brut.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").trim();
  // Phosphor place la couleur sur la balise <svg>, qu'on retire : on la remet sur un groupe.
  if (fichier.startsWith("ph-")) interieur = `<g fill="currentColor">${interieur}</g>`;
  return `<symbol id="${fichier.replace(/\.svg$/, "")}" viewBox="${viewBox}">${interieur}</symbol>`;
});

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/sprite.svg", `<svg xmlns="http://www.w3.org/2000/svg">${symboles.join("")}</svg>\n`);

const noms = fichiers.map((f) => `  "${f.replace(/\.svg$/, "")}",`).join("\n");
writeFileSync(
  "src/ui/icones.ts",
  `// Fichier généré par scripts/construire-sprite.mjs : ne pas modifier à la main.\nexport const NOMS_ICONES = [\n${noms}\n] as const;\n\nexport type NomIcone = (typeof NOMS_ICONES)[number];\n`,
);

console.log(`${fichiers.length} icônes assemblées.`);
