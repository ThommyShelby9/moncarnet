import type { ConstatVisite, InscriptionDonnees } from "@/domain/evenements";
import { uuidV7 } from "@/domain/identifiants";
import type { CodeSigne } from "@/domain/signes-danger";
import type { SaisieEnAttente } from "./file";

export interface Visite {
  personne: { id: string; prenom: string; nom: string };
  constat: ConstatVisite;
  texte?: string;
  tension?: { sys: number; dia: number };
  signes: CodeSigne[];
  avecNote: boolean;
}

const nouvelId = () => uuidV7();

/**
 * Une visite devient une ou plusieurs saisies de la file, qui partent dans cet ordre :
 * le signe de danger d'abord (il crée l'alerte du centre), puis la tension, puis la visite, qui porte la note vocale.
 */
export function saisiesDeVisite(v: Visite, maintenant: Date, id: () => string = nouvelId): SaisieEnAttente[] {
  const groupe = id();
  const nomComplet = `${v.personne.prenom} ${v.personne.nom}`;
  const commun = { patientId: v.personne.id, survenuLe: maintenant.toISOString(), groupe, nature: "visite" as const };
  const saisies: SaisieEnAttente[] = [];
  if (v.signes.length) {
    saisies.push({ ...commun, id: id(), type: "signalement_danger", donnees: { signes: v.signes, source: "relais" }, libelle: `Signe de danger chez ${nomComplet}` });
  }
  if (v.tension) {
    saisies.push({
      ...commun,
      id: id(),
      type: "mesure",
      donnees: { mesures: { tensionSys: v.tension.sys, tensionDia: v.tension.dia } },
      libelle: `Tension de ${nomComplet}`,
    });
  }
  saisies.push({
    ...commun,
    id: groupe,
    type: "visite_domicile",
    donnees: { constat: v.constat, noteVocale: v.avecNote, ...(v.texte ? { texte: v.texte } : {}) },
    libelle: `Visite chez ${nomComplet}`,
    avecNote: v.avecNote,
  });
  return saisies;
}

/** L'inscription porte l'identifiant du nouveau carnet : on peut visiter la personne avant que l'inscription soit partie. */
export function saisieDInscription(donnees: InscriptionDonnees, maintenant: Date, id: () => string = nouvelId): SaisieEnAttente {
  const evenementId = id();
  return {
    id: evenementId,
    patientId: id(),
    type: "inscription",
    survenuLe: maintenant.toISOString(),
    donnees,
    libelle: `Inscription de ${donnees.prenom} ${donnees.nom}`,
    groupe: evenementId,
    nature: "inscription",
  };
}
