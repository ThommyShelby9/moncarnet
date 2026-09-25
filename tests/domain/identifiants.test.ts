import { describe, expect, it } from "vitest";
import { estUuid, uuidV7 } from "@/domain/identifiants";

describe("estUuid", () => {
  it("reconnaît un identifiant de la base", () => {
    expect(estUuid("0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f")).toBe(true);
  });

  it("refuse le reste sans erreur", () => {
    expect(estUuid("n'importe-quoi")).toBe(false);
    expect(estUuid(undefined)).toBe(false);
  });
});

describe("uuidV7", () => {
  it("met l'instant au début : les identifiants se rangent dans l'ordre de création", () => {
    const a = uuidV7(Date.UTC(2026, 8, 25, 10, 0, 0));
    const b = uuidV7(Date.UTC(2026, 8, 25, 10, 0, 1));
    expect(a < b).toBe(true);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(estUuid(a)).toBe(true);
  });

  it("écrit l'instant sur les 48 premiers bits", () => {
    expect(uuidV7(0x0123456789ab, (n) => new Uint8Array(n)).slice(0, 13)).toBe("01234567-89ab");
  });
});
