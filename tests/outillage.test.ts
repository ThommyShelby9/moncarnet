import { describe, expect, it } from "vitest";

describe("outillage", () => {
  it("exécute les tests TypeScript", () => {
    const somme: number = [1, 2, 3].reduce((a, b) => a + b, 0);
    expect(somme).toBe(6);
  });
});
