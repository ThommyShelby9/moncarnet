import {
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
// Imports relatifs uniquement : drizzle-kit ne résout pas l'alias « @/ ».
import { CODES_PROGRAMMES, MOTIFS_RDV } from "../../domain/programmes/types";
import type { LigneTraitement } from "../../domain/traitements";

export const ROLES_COMPTE = ["patient", "relais", "soignant", "pharmacie", "pilotage", "admin"] as const;
export type RoleCompte = (typeof ROLES_COMPTE)[number];
/** Relation du titulaire du compte avec la personne dont il gère le carnet. */
export const LIENS_RESPONSABLE = ["soi", "conjoint", "parent", "enfant", "aidant"] as const;
export type LienResponsable = (typeof LIENS_RESPONSABLE)[number];
export const LANGUES = ["fr", "fon", "adja", "yo", "bariba", "dendi"] as const;
export type Langue = (typeof LANGUES)[number];
export const CANAUX = ["whatsapp", "sms", "vocal", "relais"] as const;
export type Canal = (typeof CANAUX)[number];

export const roleCompte = pgEnum("role_compte", ROLES_COMPTE);
export const typeEtablissement = pgEnum("type_etablissement", ["centre_sante", "pharmacie"]);
export const langue = pgEnum("langue", LANGUES);
export const canal = pgEnum("canal", CANAUX);
export const sexe = pgEnum("sexe", ["F", "M"]);
export const lienResponsable = pgEnum("lien_responsable", LIENS_RESPONSABLE);
export const roleContact = pgEnum("role_contact", ["principal", "secours"]);
export const proprietaireContact = pgEnum("proprietaire_contact", ["soi", "proche", "relais"]);
export const codeProgramme = pgEnum("code_programme", CODES_PROGRAMMES);
export const motifRdv = pgEnum("motif_rdv", MOTIFS_RDV);
export const moment = pgEnum("moment", ["matin", "apres_midi"]);
export const sourceRdv = pgEnum("source_rdv", ["programme", "patient", "relais", "soignant"]);
export const statutAttente = pgEnum("statut_attente", ["en_attente", "proposee", "acceptee", "expiree", "annulee"]);

const horodatage = (nom: string) => timestamp(nom, { withTimezone: true });
const creeLe = () => horodatage("cree_le").defaultNow().notNull();

export const communes = pgTable("communes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  departement: text("departement").notNull(),
  /** Zone sanitaire qui regroupe la commune avec ses voisines (pilotage). */
  zoneSanitaire: text("zone_sanitaire"),
});

export const etablissements = pgTable("etablissements", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  type: typeEtablissement("type").notNull(),
  communeId: uuid("commune_id").notNull().references(() => communes.id),
  telephone: text("telephone"),
});

export const comptes = pgTable("comptes", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: roleCompte("role").notNull(),
  /** Téléphone normalisé (+229…) pour les patients, nom d'utilisateur pour le personnel. */
  identifiant: text("identifiant").notNull().unique(),
  nomAffiche: text("nom_affiche").notNull(),
  empreinteSecret: text("empreinte_secret").notNull(),
  etablissementId: uuid("etablissement_id").references(() => etablissements.id),
  communeId: uuid("commune_id").references(() => communes.id),
  echecsConnexion: integer("echecs_connexion").notNull().default(0),
  verrouilleJusqua: horodatage("verrouille_jusqua"),
  creeLe: creeLe(),
});

export const sessions = pgTable("sessions", {
  /** Empreinte SHA-256 du jeton : le jeton lui-même n'est jamais stocké. */
  id: text("id").primaryKey(),
  compteId: uuid("compte_id")
    .notNull()
    .references(() => comptes.id, { onDelete: "cascade" }),
  expireLe: horodatage("expire_le").notNull(),
  creeLe: creeLe(),
});

export const foyers = pgTable("foyers", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  village: text("village").notNull(),
  communeId: uuid("commune_id").notNull().references(() => communes.id),
  relaisId: uuid("relais_id").references(() => comptes.id),
  creeLe: creeLe(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  foyerId: uuid("foyer_id").references(() => foyers.id),
  prenom: text("prenom").notNull(),
  nom: text("nom").notNull(),
  dateNaissance: date("date_naissance", { mode: "string" }).notNull(),
  sexe: sexe("sexe").notNull(),
  langue: langue("langue").notNull().default("fon"),
  canalPrefere: canal("canal_prefere").notNull().default("sms"),
  malvoyant: boolean("malvoyant").notNull().default(false),
  malentendant: boolean("malentendant").notNull().default(false),
  codeCourt: text("code_court").notNull().unique(),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  mereId: uuid("mere_id").references((): AnyPgColumn => patients.id),
  antecedents: jsonb("antecedents").$type<{ cesarienne?: boolean }>().notNull().default({}),
  creeLe: creeLe(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  telephone: text("telephone").notNull(),
  role: roleContact("role").notNull(),
  proprietaire: proprietaireContact("proprietaire").notNull(),
  verifieLe: horodatage("verifie_le"),
});

export const consentements = pgTable("consentements", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  canal: canal("canal").notNull(),
  accordeLe: horodatage("accorde_le").defaultNow().notNull(),
  retireLe: horodatage("retire_le"),
  recueilliPar: uuid("recueilli_par").references(() => comptes.id),
});

export const responsables = pgTable(
  "responsables",
  {
    compteId: uuid("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    lien: lienResponsable("lien").notNull(),
  },
  (t) => [primaryKey({ columns: [t.compteId, t.patientId] })],
);

export const inscriptions = pgTable("inscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  programme: codeProgramme("programme").notNull(),
  dateReference: date("date_reference", { mode: "string" }).notNull(),
  dateInscription: date("date_inscription", { mode: "string" }).notNull(),
  active: boolean("active").notNull().default(true),
  creeLe: creeLe(),
});

export const modelesPlages = pgTable("modeles_plages", {
  id: uuid("id").primaryKey().defaultRandom(),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  motif: motifRdv("motif").notNull(),
  /** 1 = lundi … 7 = dimanche. */
  jourSemaine: integer("jour_semaine").notNull(),
  moment: moment("moment").notNull(),
  capacite: integer("capacite").notNull(),
});

export const creneaux = pgTable(
  "creneaux",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
    motif: motifRdv("motif").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    moment: moment("moment").notNull(),
    capacite: integer("capacite").notNull(),
  },
  (t) => [uniqueIndex("creneaux_unique").on(t.etablissementId, t.motif, t.date, t.moment)],
);

export const rendezVous = pgTable("rendez_vous", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  inscriptionId: uuid("inscription_id").references(() => inscriptions.id, { onDelete: "set null" }),
  etapeCode: text("etape_code"),
  motif: motifRdv("motif").notNull(),
  datePrevue: date("date_prevue", { mode: "string" }).notNull(),
  moment: moment("moment"),
  creneauId: uuid("creneau_id").references(() => creneaux.id),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  source: sourceRdv("source").notNull(),
  reserveLe: horodatage("reserve_le"),
  annuleLe: horodatage("annule_le"),
  creeLe: creeLe(),
});

export const evenements = pgTable("evenements", {
  /** Identifiant créé sur l'appareil (UUID) : rend la synchronisation hors-ligne idempotente. */
  id: uuid("id").primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  auteurId: uuid("auteur_id").references(() => comptes.id),
  survenuLe: horodatage("survenu_le").notNull(),
  recuLe: horodatage("recu_le").defaultNow().notNull(),
  donnees: jsonb("donnees").$type<Record<string, unknown>>().notNull(),
});

/** Ligne d'ordonnance : médicament, nombre de prises par moment, durée, et en mots simples pourquoi et comment. */
export type LigneOrdonnance = LigneTraitement;

export const ordonnances = pgTable("ordonnances", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  prescripteurId: uuid("prescripteur_id").notNull().references(() => comptes.id),
  lignes: jsonb("lignes").$type<LigneOrdonnance[]>().notNull(),
  codeRetrait: text("code_retrait").notNull().unique(),
  emiseLe: horodatage("emise_le").defaultNow().notNull(),
});

export const listeAttente = pgTable("liste_attente", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  motif: motifRdv("motif").notNull(),
  dateSouhaitee: date("date_souhaitee", { mode: "string" }).notNull(),
  moment: moment("moment").notNull(),
  statut: statutAttente("statut").notNull().default("en_attente"),
  creeLe: creeLe(),
  proposeLe: horodatage("propose_le"),
  expireLe: horodatage("expire_le"),
});

/** Alerte née d'un signalement de danger : le centre a 15 minutes pour la prendre en charge. */
export const alertes = pgTable("alertes", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  /** Un signalement ne crée qu'une alerte, même s'il arrive deux fois. */
  evenementId: uuid("evenement_id")
    .notNull()
    .unique()
    .references(() => evenements.id, { onDelete: "cascade" }),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  creeeLe: horodatage("creee_le").defaultNow().notNull(),
  echeance: horodatage("echeance").notNull(),
  priseEnChargePar: uuid("prise_en_charge_par").references(() => comptes.id),
  priseEnChargeLe: horodatage("prise_en_charge_le"),
  remonteeLe: horodatage("remontee_le"),
  annuleeLe: horodatage("annulee_le"),
});

export const contenus = pgTable("contenus", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  categorie: text("categorie").notNull(),
  pictogramme: text("pictogramme").notNull(),
});

export const contenusTraductions = pgTable(
  "contenus_traductions",
  {
    contenuId: uuid("contenu_id")
      .notNull()
      .references(() => contenus.id, { onDelete: "cascade" }),
    langue: langue("langue").notNull(),
    texte: text("texte").notNull(),
    audioMp3: text("audio_mp3"),
    audioOgg: text("audio_ogg"),
    videoSignes: text("video_signes"),
  },
  (t) => [primaryKey({ columns: [t.contenuId, t.langue] })],
);

/** Octets bruts (bytea) : les notes vocales restent en base, sans volume à monter. */
const octets = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (valeur) => Buffer.from(valeur),
  fromDriver: (valeur) => new Uint8Array(valeur),
});

/** Note vocale d'une visite du relais : même identifiant que l'événement de la visite. */
export const fichiers = pgTable("fichiers", {
  evenementId: uuid("evenement_id")
    .primaryKey()
    .references(() => evenements.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  taille: integer("taille").notNull(),
  donnees: octets("donnees").notNull(),
  recuLe: horodatage("recu_le").defaultNow().notNull(),
});

/** Indicateurs mensuels déjà agrégés par zone sanitaire : historique, et zones du pays sans carnets dans la démo (données fictives). */
export const indicateursZones = pgTable(
  "indicateurs_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zone: text("zone").notNull(),
    departement: text("departement").notNull(),
    mois: date("mois", { mode: "string" }).notNull(),
    code: text("code").notNull(),
    numerateur: integer("numerateur").notNull(),
    denominateur: integer("denominateur").notNull(),
  },
  (t) => [uniqueIndex("indicateurs_zones_unique").on(t.zone, t.mois, t.code)],
);

/** Salle d'attente : un numéro de passage par personne, par jour et par centre ; une urgence passe devant (spec §4.4). */
export const passages = pgTable(
  "passages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    jour: date("jour", { mode: "string" }).notNull(),
    numero: integer("numero").notNull(),
    urgent: boolean("urgent").notNull().default(false),
    arriveLe: horodatage("arrive_le").notNull(),
    appeleLe: horodatage("appele_le"),
    appelePar: uuid("appele_par").references(() => comptes.id),
  },
  (t) => [uniqueIndex("passages_numero").on(t.etablissementId, t.jour, t.numero), uniqueIndex("passages_patient").on(t.etablissementId, t.jour, t.patientId)],
);

/** Rappels de rendez-vous, canal par canal (spec §4.3) : WhatsApp, SMS et appel vocal sont simulés ; le relais passe de vive voix. */
export const rappels = pgTable(
  "rappels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    rendezVousId: uuid("rendez_vous_id")
      .notNull()
      .references(() => rendezVous.id, { onDelete: "cascade" }),
    canal: canal("canal").notNull(),
    /** Numéro qui a reçu le message ; aucun pour le relais. */
    telephone: text("telephone"),
    contenu: text("contenu").notNull(),
    envoyeLe: horodatage("envoye_le").notNull(),
    statut: text("statut").$type<"envoye" | "repondu" | "sans_reponse">().notNull().default("envoye"),
    reponse: text("reponse").$type<"viendra" | "empeche">(),
    reponduLe: horodatage("repondu_le"),
  },
  (t) => [uniqueIndex("rappels_rendez_vous_canal").on(t.rendezVousId, t.canal)],
);
