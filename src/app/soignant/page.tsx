import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PageSoignant() {
  const compte = await exigerRole("soignant");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Aujourd'hui"
      icone="hi-stethoscope"
      texte="Les consultations du jour, les alertes et la salle d'attente sont en cours de préparation."
    />
  );
}
