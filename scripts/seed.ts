import { aujourdhuiAuBenin } from "@/domain/dates";
import { connexion } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";

async function principal() {
  const c = connexion();
  await c.migrer();
  const bilan = await semerDemo(c.db, { aujourdhui: aujourdhuiAuBenin() });
  console.log("Démo prête :", bilan);
  await c.fermer();
}

principal().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
