import { joursEntre, type DateISO } from "./dates";
import type { MotifRdv } from "./programmes/types";
import {
  dateLongue,
  LIBELLE_MOMENT,
  LIBELLE_MOMENT_RDV,
  libelleDansJours,
  libelleJour,
  majuscule,
  momentCommence,
  MOMENTS_PRISE,
  type MomentPrise,
} from "./temps";
import { cleDePrise, statutsDesPrises, type PriseNotee, type TraitementEnCours } from "./traitements";

/** Rendez-vous des 7 prochains jours dans la pile ; au-delà, le premier devient « ensuite ». */
export const HORIZON_PILE_JOURS = 7;
/** Une chose à la fois : pas plus de 5 cartes. */
export const MAX_PILE = 5;
/** Au-delà de 60 jours, une étape manquée n'est plus rappelée sur l'accueil. */
const RETARD_MAX_JOURS = 60;

export interface RendezVousVu {
  id: string;
  patientId: string;
  motif: MotifRdv;
  libelle: string;
  datePrevue: DateISO;
  moment: "matin" | "apres_midi" | null;
  /** Place réservée sur un créneau. */
  reserve: boolean;
  /** Rendez-vous d'une étape de programme (vaccin, consultation prénatale, contrôle). */
  programme: boolean;
  /** Étape déjà faite (consultation ou vaccin enregistrés). */
  faite: boolean;
}

export type CarteDuJour =
  | {
      type: "prise";
      cle: string;
      patientId: string;
      traitementCle: string;
      moment: MomentPrise;
      quantite: number;
      medicament: string;
      indication?: string;
      conseil?: string;
      reportee: boolean;
    }
  | {
      type: "rendez_vous";
      cle: string;
      patientId: string;
      rendezVousId: string;
      motif: MotifRdv;
      libelle: string;
      date: DateISO;
      moment: "matin" | "apres_midi" | null;
      reserve: boolean;
      dansJours: number;
    }
  | { type: "manque"; cle: string; patientId: string; rendezVousId: string; motif: MotifRdv; libelle: string; date: DateISO };

export interface EntreeCartes {
  aujourdhui: DateISO;
  /** Heure au Bénin, de 0 à 23. */
  heure: number;
  traitements: TraitementEnCours[];
  prisesDuJour: PriseNotee[];
  rendezVous: RendezVousVu[];
}

/** Jours après la date prévue au-delà desquels l'étape est manquée (comme dans les programmes). */
export function toleranceManque(motif: MotifRdv): number {
  return motif === "vaccin" ? 14 : 7;
}

const RANG = { priseDue: 0, rdvDuJour: 1, manque: 2, priseAVenir: 3, rdvProche: 4, priseReportee: 5 } as const;

export function cartesDuJour(e: EntreeCartes): { pile: CarteDuJour[]; ensuite: CarteDuJour | null } {
  const classees: { rang: number; ordre: number; carte: CarteDuJour }[] = [];
  const statuts = statutsDesPrises(e.prisesDuJour);

  for (const t of e.traitements) {
    for (const p of t.prises) {
      const statut = statuts.get(cleDePrise(t.cle, p.moment));
      if (statut === "fait") continue;
      const reportee = statut === "plus_tard";
      const rang = reportee ? RANG.priseReportee : momentCommence(p.moment, e.heure) ? RANG.priseDue : RANG.priseAVenir;
      classees.push({
        rang,
        ordre: MOMENTS_PRISE.indexOf(p.moment),
        carte: {
          type: "prise",
          cle: `prise:${t.cle}:${p.moment}`,
          patientId: t.patientId,
          traitementCle: t.cle,
          moment: p.moment,
          quantite: p.quantite,
          medicament: t.medicament,
          indication: t.indication,
          conseil: t.conseil,
          reportee,
        },
      });
    }
  }

  const aVenir = e.rendezVous
    .filter((r) => !r.faite && joursEntre(e.aujourdhui, r.datePrevue) >= 0)
    .sort((a, b) => a.datePrevue.localeCompare(b.datePrevue));
  let ensuite: CarteDuJour | null = null;
  for (const r of aVenir) {
    const dansJours = joursEntre(e.aujourdhui, r.datePrevue);
    const carte: CarteDuJour = {
      type: "rendez_vous",
      cle: `rdv:${r.id}`,
      patientId: r.patientId,
      rendezVousId: r.id,
      motif: r.motif,
      libelle: r.libelle,
      date: r.datePrevue,
      moment: r.moment,
      reserve: r.reserve,
      dansJours,
    };
    if (dansJours <= HORIZON_PILE_JOURS) classees.push({ rang: dansJours === 0 ? RANG.rdvDuJour : RANG.rdvProche, ordre: dansJours, carte });
    else ensuite ??= carte;
  }

  for (const r of e.rendezVous) {
    if (!r.programme || r.faite) continue;
    const retard = joursEntre(r.datePrevue, e.aujourdhui);
    if (retard <= toleranceManque(r.motif) || retard > RETARD_MAX_JOURS) continue;
    const rattrape = aVenir.some((a) => a.patientId === r.patientId && a.motif === r.motif && a.reserve);
    if (rattrape) continue;
    classees.push({
      rang: RANG.manque,
      ordre: -retard,
      carte: { type: "manque", cle: `manque:${r.id}`, patientId: r.patientId, rendezVousId: r.id, motif: r.motif, libelle: r.libelle, date: r.datePrevue },
    });
  }

  classees.sort((a, b) => a.rang - b.rang || a.ordre - b.ordre);
  return { pile: classees.slice(0, MAX_PILE).map((c) => c.carte), ensuite };
}

export function surtitre(carte: CarteDuJour, aujourdhui: DateISO): string {
  switch (carte.type) {
    case "prise":
      return LIBELLE_MOMENT[carte.moment];
    case "rendez_vous":
      return carte.reserve ? libelleJour(carte.date, aujourdhui) : `À prévoir ${libelleDansJours(carte.dansJours)}`;
    case "manque":
      return "À rattraper";
  }
}

export function titreCarte(carte: CarteDuJour): string {
  if (carte.type !== "prise") return carte.libelle;
  const quantite = `${carte.quantite} comprimé${carte.quantite > 1 ? "s" : ""}`;
  return carte.indication ? `${quantite} pour ${carte.indication}` : `${quantite} de ${carte.medicament}`;
}

export function detailCarte(carte: CarteDuJour, aujourdhui: DateISO): string {
  switch (carte.type) {
    case "prise":
      return carte.conseil ? `${carte.medicament}, ${carte.conseil}` : carte.medicament;
    case "rendez_vous":
      if (!carte.reserve) return "Choisissez votre jour au centre de santé.";
      return `${majuscule(libelleDansJours(joursEntre(aujourdhui, carte.date)))}${carte.moment ? `, ${LIBELLE_MOMENT_RDV[carte.moment]}` : ""}`;
    case "manque":
      return `Prévu le ${dateLongue(carte.date)}. Choisissez un autre jour.`;
  }
}

const phrase = (texte: string) => (/[.!?]$/.test(texte) ? texte : `${texte}.`);

/** Texte lu par le bouton « écouter » (synthèse vocale en français ; audio en langue au plan 6). */
export function texteAEcouter(carte: CarteDuJour, contexte: { aujourdhui: DateISO; pour: string | null }): string {
  return [
    contexte.pour ? `Pour ${contexte.pour}.` : null,
    phrase(surtitre(carte, contexte.aujourdhui)),
    phrase(titreCarte(carte)),
    phrase(detailCarte(carte, contexte.aujourdhui)),
  ]
    .filter(Boolean)
    .join(" ");
}
