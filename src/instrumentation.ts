export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("@/config/env");
  if (!env.MIGRER_AU_DEMARRAGE || !env.DATABASE_URL) return;
  const { connexion } = await import("@/server/db/client");
  await connexion().migrer();
  console.log("Migrations appliquées.");
}
