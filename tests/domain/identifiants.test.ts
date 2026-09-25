import { describe, expect, it } from "vitest";
import { estUuid } from "@/domain/identifiants";

describe("estUuid", () => {
  it("reconnaît un identifiant de la base", () => {
    expect(estUuid("0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f")).toBe(true);
  });

  it("refuse le reste sans erreur", () => {
    expect(estUuid("n'importe-quoi")).toBe(false);
    expect(estUuid(undefined)).toBe(false);
  });
});
