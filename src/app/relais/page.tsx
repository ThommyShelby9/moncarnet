import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PageRelais() {
  const compte = await exigerRole("relais");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Ma tournée"
      icone="hi-community-healthworker"
      texte="La tournée par foyer, utilisable sans réseau, est en cours de préparation."
    />
  );
}
