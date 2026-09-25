import type { Metadata } from "next";
import { exigerRole } from "@/server/auth/cookies";
import { ApplicationTournee } from "./ApplicationTournee";

export const metadata: Metadata = { title: "Ma tournée" };

/** La tournée du relais : une fois la page ouverte, tout se passe sur le téléphone, avec ou sans réseau. */
export default async function PageRelais() {
  const compte = await exigerRole("relais");
  return <ApplicationTournee relais={compte.nomAffiche} />;
}
