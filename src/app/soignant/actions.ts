"use server";

import { redirect } from "next/navigation";
import { lireSaisieConsultation } from "@/domain/consultation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { lireDeclarationNaissance } from "@/domain/naissance";
import { lireLignes } from "@/domain/ordonnances";
import type { MotifRdv } from "@/domain/programmes/types";
import { confierAuRelais } from "@/server/consignes";
import { db } from "@/server/db/client";
import { donnerPlace, modifierCapacite, ouvrirPlage } from "@/server/soignant/agenda";
import { prendreEnCharge } from "@/server/soignant/alertes";
import { enregistrerConsultation } from "@/server/soignant/consultation";
import { appelerSuivant } from "@/server/salle-attente";
import { declarerNaissance } from "@/server/soignant/naissance";
import { emettreOrdonnance } from "@/server/soignant/ordonnance";
import { exigerSoignant } from "./contexte";

export type EtatFormulaire = { message?: string; valeurs?: Record<string, string> };

/** « Je la prends en charge » : ouvre le dossier pour rappeler tout de suite. */
export async function prendreEnChargeAction(formulaire: FormData): Promise<void> {
  const soignant = await exigerSoignant();
  const resultat = await prendreEnCharge(db(), { auteur: soignant, alerteId: String(formulaire.get("alerteId") ?? "") });
  if (resultat.ok) redirect(`/soignant/patients/${resultat.donnees.patientId}?note=alerte`);
  redirect(`/soignant?note=${resultat.erreur}`);
}

const texteDu = (formulaire: FormData): Record<string, string> =>
  Object.fromEntries([...formulaire.entries()].filter(([cle]) => !cle.startsWith("$")).map(([cle, valeur]) => [cle, String(valeur)]));

export async function enregistrerConsultationAction(_: EtatFormulaire, formulaire: FormData): Promise<EtatFormulaire> {
  const soignant = await exigerSoignant();
  const valeurs = texteDu(formulaire);
  const lecture = lireSaisieConsultation(valeurs);
  if (!lecture.ok) return { message: lecture.message, valeurs };
  const resultat = await enregistrerConsultation(db(), { auteur: soignant, patientId: valeurs.patientId ?? "", saisie: lecture.saisie });
  if (!resultat.ok) {
    const message = resultat.erreur === "interdit" ? "Ce patient n'est pas suivi dans votre centre." : "Cette étape ne va pas avec le motif choisi.";
    return { message, valeurs };
  }
  redirect(`/soignant/patients/${valeurs.patientId}?note=consultation`);
}

export async function emettreOrdonnanceAction(_: EtatFormulaire, formulaire: FormData): Promise<EtatFormulaire> {
  const soignant = await exigerSoignant();
  const valeurs = texteDu(formulaire);
  const lecture = lireLignes(valeurs);
  if (!lecture.ok) return { message: lecture.message, valeurs };
  const resultat = await emettreOrdonnance(db(), { auteur: soignant, patientId: valeurs.patientId ?? "", lignes: lecture.lignes });
  if (!resultat.ok) {
    const message = resultat.erreur === "interdit" ? "Ce patient n'est pas suivi dans votre centre." : "Le code de retrait n'a pas pu être créé. Réessayez.";
    return { message, valeurs };
  }
  redirect(`/soignant/patients/${valeurs.patientId}?note=ordonnance&code=${resultat.donnees.codeRetrait}`);
}

/** Naissance déclarée par la sage-femme : on arrive sur le carnet du bébé qui vient d'être créé. */
export async function declarerNaissanceAction(_: EtatFormulaire, formulaire: FormData): Promise<EtatFormulaire> {
  const soignant = await exigerSoignant();
  const valeurs = texteDu(formulaire);
  const lecture = lireDeclarationNaissance(valeurs, new Date());
  if (!lecture.ok) return { message: lecture.message, valeurs };
  const resultat = await declarerNaissance(db(), { auteur: soignant, mereId: valeurs.mereId ?? "", saisie: lecture.saisie });
  if (!resultat.ok) {
    const message = resultat.erreur === "interdit" ? "Cette patiente n'est pas suivie dans votre centre." : "Aucune grossesse en cours : la naissance est peut-être déjà enregistrée.";
    return { message, valeurs };
  }
  redirect(`/soignant/patients/${resultat.donnees.bebeId}?note=naissance`);
}

/** « Appeler le suivant » : la personne suivante de la salle d'attente (l'urgence d'abord), et son dossier s'ouvre. */
export async function appelerSuivantAction(): Promise<void> {
  const soignant = await exigerSoignant();
  const resultat = await appelerSuivant(db(), { soignant });
  if (resultat.ok) redirect(`/soignant/patients/${resultat.donnees.patientId}?note=appel&numero=${resultat.donnees.numero}`);
  redirect("/soignant?note=salle_vide");
}

/** « Ouvrir une plage » : on arrive sur la plage créée, ou on revient à l'agenda avec la raison du refus. */
export async function ouvrirPlageAction(formulaire: FormData): Promise<void> {
  const soignant = await exigerSoignant();
  const date = String(formulaire.get("date") ?? "");
  const resultat = await ouvrirPlage(db(), {
    soignant,
    date,
    moment: formulaire.get("moment") === "apres_midi" ? "apres_midi" : "matin",
    motif: String(formulaire.get("motif") ?? "") as MotifRdv,
    capacite: Number(formulaire.get("capacite")),
    aujourdhui: aujourdhuiAuBenin(),
  });
  if (resultat.ok) redirect(`/soignant/agenda/${resultat.donnees.creneauId}?note=ouverte`);
  redirect(`/soignant/agenda?note=${resultat.erreur}`);
}

/** Boutons − et + d'une plage. */
export async function modifierCapaciteAction(formulaire: FormData): Promise<void> {
  const soignant = await exigerSoignant();
  const creneauId = String(formulaire.get("creneauId") ?? "");
  const resultat = await modifierCapacite(db(), { soignant, creneauId, capacite: Number(formulaire.get("capacite")) });
  redirect(`/soignant/agenda/${encodeURIComponent(creneauId)}?note=${resultat.ok ? "capacite" : resultat.erreur}`);
}

/** « Donner la place » à une personne de la liste d'attente. */
export async function donnerPlaceAction(formulaire: FormData): Promise<void> {
  const soignant = await exigerSoignant();
  const creneauId = String(formulaire.get("creneauId") ?? "");
  const resultat = await donnerPlace(db(), { soignant, creneauId, attenteId: String(formulaire.get("attenteId") ?? "") });
  redirect(`/soignant/agenda/${encodeURIComponent(creneauId)}?note=${resultat.ok ? "place_donnee" : resultat.erreur}`);
}

const LISTES_SUIVI = ["grossesses", "vaccins", "tension", "perdus"] as const;

/** « Confier au relais » depuis une liste de suivi : la consigne part dans la tournée du relais du foyer. */
export async function confierAuRelaisAction(formulaire: FormData): Promise<void> {
  const soignant = await exigerSoignant();
  const liste = LISTES_SUIVI.find((l) => l === formulaire.get("liste")) ?? "grossesses";
  const resultat = await confierAuRelais(db(), { soignant, patientId: String(formulaire.get("patientId") ?? ""), texte: String(formulaire.get("texte") ?? "") });
  redirect(`/soignant/suivis?liste=${liste}&note=${resultat.ok ? "confiee" : resultat.erreur}`);
}
