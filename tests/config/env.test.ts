import { describe, expect, it } from "vitest";
import { lireEnv } from "@/config/env";

describe("lireEnv", () => {
  it("applique les valeurs par défaut", () => {
    const env = lireEnv({});
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Gbè");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.DEMO_MODE).toBe(true);
    expect(env.MIGRER_AU_DEMARRAGE).toBe(true);
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("lit le nom et l'adresse de la plateforme", () => {
    const env = lireEnv({ NEXT_PUBLIC_APP_NAME: "Nouveau nom", APP_URL: "https://sante.kheios.com" });
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Nouveau nom");
    expect(env.APP_URL).toBe("https://sante.kheios.com");
  });

  it("convertit les booléens écrits en texte", () => {
    expect(lireEnv({ DEMO_MODE: "false" }).DEMO_MODE).toBe(false);
    expect(lireEnv({ MIGRER_AU_DEMARRAGE: "false" }).MIGRER_AU_DEMARRAGE).toBe(false);
  });

  it("refuse une adresse de base qui n'est pas Postgres", () => {
    expect(() => lireEnv({ DATABASE_URL: "mysql://localhost/sante" })).toThrow(/DATABASE_URL/);
  });

  it("refuse un secret trop court", () => {
    expect(() => lireEnv({ CRON_SECRET: "court" })).toThrow(/CRON_SECRET/);
  });
});
