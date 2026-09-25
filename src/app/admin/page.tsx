import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PageAdmin() {
  const compte = await exigerRole("admin");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Administration"
      icone="ph-list-checks"
      texte="La gestion des contenus, des plages de rendez-vous et des comptes est en cours de préparation."
    />
  );
}
