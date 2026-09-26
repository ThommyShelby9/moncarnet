import type { RoleCompte } from "../db/schema";

export interface CompteDemo {
  identifiant: string;
  secret: string;
  role: RoleCompte;
  nomAffiche: string;
  description: string;
  /** Les étapes à montrer au jury, dans l'ordre. */
  parcours?: string[];
  /** Pilotage : « national » pour le ministère ; sinon la zone sanitaire de la commune du compte. */
  portee?: "national";
}

/** Comptes fictifs. Codes et mots de passe publics : réservés à la démonstration. */
export const COMPTES_DEMO: CompteDemo[] = [
  {
    identifiant: "+2290197000002",
    secret: "1234",
    role: "patient",
    nomAffiche: "Awa Hounkpatin",
    description: "Enceinte de 37 semaines, jusqu'à la naissance de son bébé",
    parcours: [
      "« Ma grossesse » : la semaine, la taille du bébé, les consultations tamponnées",
      "Préparer la naissance : cocher ce qui est prêt",
      "« J'ai un problème » → « Le travail a commencé » : l'alerte part au centre",
      "Adjoa déclare la naissance : le carnet du bébé apparaît dans « Famille »",
    ],
  },
  {
    identifiant: "+2290197000001",
    secret: "1234",
    role: "patient",
    nomAffiche: "Codjo Houngbo",
    description: "Patient au quotidien : sa tension, ses médicaments, ses rendez-vous, les carnets de sa famille",
    parcours: [
      "Accueil : « Ce soir, 1 comprimé », l'écouter, « C'est fait »",
      "Prendre rendez-vous en 4 étapes pour son petit-fils Sèna",
      "Mon carnet : sa courbe de tension et ses médicaments",
      "Firmin le reçoit : tension, risque, ordonnance ; la pharmacie la délivre",
    ],
  },
  { identifiant: "+2290197000004", secret: "1234", role: "patient", nomAffiche: "Aïcha Salifou", description: "S'occupe de sa mère Rachida, 71 ans, malvoyante et diabétique" },
  { identifiant: "koffi.agbessi", secret: "demo1234", role: "relais", nomAffiche: "Koffi Agbessi", description: "Relais communautaire de Sèhoun" },
  { identifiant: "adjoa.gbaguidi", secret: "demo1234", role: "soignant", nomAffiche: "Adjoa Gbaguidi", description: "Sage-femme, centre de santé de Bohicon" },
  { identifiant: "firmin.akpovi", secret: "demo1234", role: "soignant", nomAffiche: "Firmin Akpovi", description: "Infirmier, centre de santé de Bohicon" },
  { identifiant: "pharmacie.sainte-rita", secret: "demo1234", role: "pharmacie", nomAffiche: "Pharmacie Sainte-Rita", description: "Pharmacie de Bohicon · ordonnance à délivrer : M4R2TN" },
  {
    identifiant: "zone.bohicon",
    secret: "demo1234",
    role: "pilotage",
    nomAffiche: "Zone sanitaire Zogbodomey-Bohicon-Zakpota",
    description: "Agents de l'État : les indicateurs de la zone, commune par commune, sans aucun nom",
  },
  {
    identifiant: "ministere.sante",
    secret: "demo1234",
    role: "pilotage",
    nomAffiche: "Ministère de la Santé",
    description: "Vue nationale : toutes les zones sanitaires, tendances, zones à appuyer, export (données fictives)",
    portee: "national",
  },
  { identifiant: "admin", secret: "demo1234", role: "admin", nomAffiche: "Administration", description: "Contenus, plages de rendez-vous et comptes" },
];
