import { aujourdhuiAuBenin } from "@/domain/dates";
import { redirect } from "next/navigation";
import { compteCourant, exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { carnetsDuCompte, choisirCarnet } from "@/server/requetes/carnets";

type Parametre = string | string[] | undefined;

export const texteDe = (valeur: Parametre): string | undefined => (typeof valeur === "string" ? valeur : undefined);

/** Compte connecté, carnets de la famille et carnet affiché (`?pour=`), pour toutes les pages patient. */
export async function contextePatient(pour?: Parametre) {
  // Un visiteur sans session découvre d'abord la plateforme ; la présentation mène à la connexion.
  if (!(await compteCourant())) redirect("/decouvrir");
  const compte = await exigerRole("patient");
  const aujourdhui = aujourdhuiAuBenin();
  const carnets = await carnetsDuCompte(db(), compte.id, aujourdhui);
  const carnet = choisirCarnet(carnets, texteDe(pour));
  const titulaire = carnets.find((c) => c.lien === "soi") ?? carnets[0] ?? null;
  return { compte, aujourdhui, carnets, carnet, titulaire };
}
