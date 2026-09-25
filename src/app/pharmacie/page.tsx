import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PagePharmacie() {
  const compte = await exigerRole("pharmacie");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Ordonnances"
      icone="hi-pharmacy"
      texte="La recherche d'une ordonnance par son code et la délivrance sont en cours de préparation."
    />
  );
}
