import { timingSafeEqual } from "node:crypto";

export function autoriserReinitialisation(entete: string | null, config: { DEMO_MODE: boolean; CRON_SECRET?: string }): boolean {
  if (!config.DEMO_MODE || !config.CRON_SECRET || !entete) return false;
  const recu = Buffer.from(entete);
  const attendu = Buffer.from(`Bearer ${config.CRON_SECRET}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}
