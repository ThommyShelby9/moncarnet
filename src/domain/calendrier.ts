import { ajouterJours, joursEntre, type DateISO } from "./dates";
import type { MotifRdv, Programme } from "./programmes/types";

export interface EtapePlanifiee {
  code: string;
  libelle: string;
  motif: MotifRdv;
  rendezVous: boolean;
  datePrevue: DateISO;
  debutFenetre: DateISO;
  finFenetre: DateISO;
  toleranceManqueJours: number;
  details?: string;
}

/**
 * Planifie les étapes d'un programme pour une personne.
 * Une étape dont la fenêtre est entièrement passée à l'inscription n'est pas générée ;
 * une étape dont la date cible est passée mais la fenêtre encore ouverte est planifiée à l'inscription + 7 jours.
 */
export function planifier(programme: Programme, dateReference: DateISO, dateInscription: DateISO): EtapePlanifiee[] {
  return programme.etapes(dateReference, dateInscription).flatMap((etape) => {
    const finFenetre = ajouterJours(dateReference, etape.finFenetreJours);
    if (joursEntre(dateInscription, finFenetre) < 0) return [];
    const cible = ajouterJours(dateReference, etape.cibleJours);
    const datePrevue = joursEntre(dateInscription, cible) >= 0 ? cible : ajouterJours(dateInscription, 7);
    return [
      {
        code: etape.code,
        libelle: etape.libelle,
        motif: etape.motif,
        rendezVous: etape.rendezVous,
        datePrevue,
        debutFenetre: ajouterJours(dateReference, etape.debutFenetreJours),
        finFenetre,
        toleranceManqueJours: etape.toleranceManqueJours,
        details: etape.details,
      },
    ];
  });
}
