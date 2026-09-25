import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PagePilotage() {
  const compte = await exigerRole("pilotage");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Pilotage"
      icone="hi-ambulatory-clinic"
      texte="Les indicateurs anonymes par commune sont en cours de préparation."
    />
  );
}
