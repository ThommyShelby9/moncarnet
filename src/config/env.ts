import { z } from "zod";

const schemaEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("Mon Carnet"),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "doit commencer par postgres://")
    .optional(),
  CRON_SECRET: z.string().min(16, "doit contenir au moins 16 caractères").optional(),
  DEMO_MODE: z.stringbool().default(true),
  MIGRER_AU_DEMARRAGE: z.stringbool().default(true),
});

export type Env = z.infer<typeof schemaEnv>;

export function lireEnv(source: Record<string, string | undefined> = process.env): Env {
  const resultat = schemaEnv.safeParse(source);
  if (!resultat.success) {
    const details = resultat.error.issues
      .map((probleme) => `${probleme.path.join(".")} ${probleme.message}`)
      .join(" ; ");
    throw new Error(`Configuration invalide : ${details}`);
  }
  return resultat.data;
}

export const env = lireEnv();
