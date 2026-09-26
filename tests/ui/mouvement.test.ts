import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const reduit = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

describe("animations", () => {
  it("s'arrêtent toutes quand le téléphone demande de réduire les animations, boucles et défilement compris", () => {
    for (const regle of ["animation-duration: 0.01ms !important", "animation-iteration-count: 1 !important", "animation-timeline: auto !important", "transition-duration: 0.01ms !important"]) {
      expect(reduit).toContain(regle);
    }
  });

  it("n'animent que la transformation et l'opacité (et l'ombre des pulsations), pour rester fluides sur un petit téléphone", () => {
    const keyframes = [...css.matchAll(/@keyframes [a-z]+ \{([\s\S]*?)\n  \}/g)].map((m) => m[1]!);
    expect(keyframes.length).toBeGreaterThanOrEqual(10);
    const proprietes = new Set(keyframes.flatMap((k) => [...k.matchAll(/^\s+([a-z-]+):/gm)].map((m) => m[1]!)));
    expect([...proprietes].filter((p) => !["transform", "opacity", "box-shadow", "stroke-dashoffset"].includes(p))).toEqual([]);
  });
});
