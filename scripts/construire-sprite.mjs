import { createHash } from "node:crypto";
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
const sprite = `<svg xmlns="http://www.w3.org/2000/svg">${symboles.join("")}</svg>\n`;
writeFileSync("public/icons/sprite.svg", sprite);
// Empreinte du contenu : l'adresse change avec le sprite, qui peut donc rester longtemps en cache (pictogrammes visibles sans réseau).
const version = createHash("sha256").update(sprite).digest("hex").slice(0, 8);

const noms = fichiers.map((f) => `  "${f.replace(/\.svg$/, "")}",`).join("\n");
writeFileSync(
  "src/ui/icones.ts",
  `// Fichier généré par scripts/construire-sprite.mjs : ne pas modifier à la main.\nexport const NOMS_ICONES = [\n${noms}\n] as const;\n\nexport type NomIcone = (typeof NOMS_ICONES)[number];\n\nexport const VERSION_SPRITE = "${version}";\n`,
);

console.log(`${fichiers.length} icônes assemblées.`);
