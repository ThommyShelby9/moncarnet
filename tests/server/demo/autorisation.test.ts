import { describe, expect, it } from "vitest";
import { autoriserReinitialisation } from "@/server/demo/autorisation";

const secret = "0123456789abcdef0123456789abcdef";

describe("autoriserReinitialisation", () => {
  it("accepte le bon secret en mode démo", () => {
    expect(autoriserReinitialisation(`Bearer ${secret}`, { DEMO_MODE: true, CRON_SECRET: secret })).toBe(true);
  });

  it("refuse hors mode démo, sans secret configuré, ou avec un mauvais secret", () => {
    expect(autoriserReinitialisation(`Bearer ${secret}`, { DEMO_MODE: false, CRON_SECRET: secret })).toBe(false);
    expect(autoriserReinitialisation(`Bearer ${secret}`, { DEMO_MODE: true })).toBe(false);
    expect(autoriserReinitialisation("Bearer faux", { DEMO_MODE: true, CRON_SECRET: secret })).toBe(false);
    expect(autoriserReinitialisation(null, { DEMO_MODE: true, CRON_SECRET: secret })).toBe(false);
  });
});
