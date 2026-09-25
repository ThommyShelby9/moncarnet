import type { RoleCompte } from "../db/schema";

export interface CompteDemo {
  identifiant: string;
  secret: string;
  role: RoleCompte;
  nomAffiche: string;
  description: string;
}

/** Comptes fictifs. Codes et mots de passe publics : réservés à la démonstration. */
export const COMPTES_DEMO: CompteDemo[] = [
  { identifiant: "+2290197000001", secret: "1234", role: "patient", nomAffiche: "Codjo Houngbo", description: "58 ans, suit sa tension, gère les carnets de sa femme et de son petit-fils" },
  { identifiant: "+2290197000002", secret: "1234", role: "patient", nomAffiche: "Awa Hounkpatin", description: "Enceinte de 32 semaines" },
  { identifiant: "+2290197000004", secret: "1234", role: "patient", nomAffiche: "Aïcha Salifou", description: "S'occupe de sa mère Rachida, 71 ans, malvoyante et diabétique" },
  { identifiant: "koffi.agbessi", secret: "demo1234", role: "relais", nomAffiche: "Koffi Agbessi", description: "Relais communautaire de Sèhoun" },
  { identifiant: "adjoa.gbaguidi", secret: "demo1234", role: "soignant", nomAffiche: "Adjoa Gbaguidi", description: "Sage-femme, centre de santé de Bohicon" },
  { identifiant: "firmin.akpovi", secret: "demo1234", role: "soignant", nomAffiche: "Firmin Akpovi", description: "Infirmier, centre de santé de Bohicon" },
  { identifiant: "pharmacie.sainte-rita", secret: "demo1234", role: "pharmacie", nomAffiche: "Pharmacie Sainte-Rita", description: "Pharmacie de Bohicon · ordonnance à délivrer : M4R2TN" },
  { identifiant: "zone.bohicon", secret: "demo1234", role: "pilotage", nomAffiche: "Zone sanitaire de Bohicon", description: "Indicateurs anonymes (zone fictive)" },
  { identifiant: "admin", secret: "demo1234", role: "admin", nomAffiche: "Administration", description: "Contenus, plages de rendez-vous et comptes" },
];
