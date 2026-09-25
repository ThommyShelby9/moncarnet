CREATE TYPE "public"."canal" AS ENUM('whatsapp', 'sms', 'vocal', 'relais');--> statement-breakpoint
CREATE TYPE "public"."code_programme" AS ENUM('consultation', 'hypertension', 'grossesse', 'vaccination', 'diabete');--> statement-breakpoint
CREATE TYPE "public"."langue" AS ENUM('fr', 'fon', 'adja', 'yo', 'bariba', 'dendi');--> statement-breakpoint
CREATE TYPE "public"."lien_responsable" AS ENUM('soi', 'conjoint', 'parent', 'enfant', 'aidant');--> statement-breakpoint
CREATE TYPE "public"."moment" AS ENUM('matin', 'apres_midi');--> statement-breakpoint
CREATE TYPE "public"."motif_rdv" AS ENUM('consultation', 'tension', 'grossesse', 'vaccin', 'diabete', 'fievre', 'dents');--> statement-breakpoint
CREATE TYPE "public"."proprietaire_contact" AS ENUM('soi', 'proche', 'relais');--> statement-breakpoint
CREATE TYPE "public"."role_compte" AS ENUM('patient', 'relais', 'soignant', 'pharmacie', 'pilotage', 'admin');--> statement-breakpoint
CREATE TYPE "public"."role_contact" AS ENUM('principal', 'secours');--> statement-breakpoint
CREATE TYPE "public"."sexe" AS ENUM('F', 'M');--> statement-breakpoint
CREATE TYPE "public"."source_rdv" AS ENUM('programme', 'patient', 'relais', 'soignant');--> statement-breakpoint
CREATE TYPE "public"."type_etablissement" AS ENUM('centre_sante', 'pharmacie');--> statement-breakpoint
CREATE TABLE "communes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"departement" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comptes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role_compte" NOT NULL,
	"identifiant" text NOT NULL,
	"nom_affiche" text NOT NULL,
	"empreinte_secret" text NOT NULL,
	"etablissement_id" uuid,
	"commune_id" uuid,
	"echecs_connexion" integer DEFAULT 0 NOT NULL,
	"verrouille_jusqua" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comptes_identifiant_unique" UNIQUE("identifiant")
);
--> statement-breakpoint
CREATE TABLE "consentements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"canal" "canal" NOT NULL,
	"accorde_le" timestamp with time zone DEFAULT now() NOT NULL,
	"retire_le" timestamp with time zone,
	"recueilli_par" uuid
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"telephone" text NOT NULL,
	"role" "role_contact" NOT NULL,
	"proprietaire" "proprietaire_contact" NOT NULL,
	"verifie_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contenus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"categorie" text NOT NULL,
	"pictogramme" text NOT NULL,
	CONSTRAINT "contenus_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "contenus_traductions" (
	"contenu_id" uuid NOT NULL,
	"langue" "langue" NOT NULL,
	"texte" text NOT NULL,
	"audio_mp3" text,
	"audio_ogg" text,
	"video_signes" text,
	CONSTRAINT "contenus_traductions_contenu_id_langue_pk" PRIMARY KEY("contenu_id","langue")
);
--> statement-breakpoint
CREATE TABLE "creneaux" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etablissement_id" uuid NOT NULL,
	"motif" "motif_rdv" NOT NULL,
	"date" date NOT NULL,
	"moment" "moment" NOT NULL,
	"capacite" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etablissements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"type" "type_etablissement" NOT NULL,
	"commune_id" uuid NOT NULL,
	"telephone" text
);
--> statement-breakpoint
CREATE TABLE "evenements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"auteur_id" uuid,
	"survenu_le" timestamp with time zone NOT NULL,
	"recu_le" timestamp with time zone DEFAULT now() NOT NULL,
	"donnees" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"village" text NOT NULL,
	"commune_id" uuid NOT NULL,
	"relais_id" uuid,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"programme" "code_programme" NOT NULL,
	"date_reference" date NOT NULL,
	"date_inscription" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modeles_plages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etablissement_id" uuid NOT NULL,
	"motif" "motif_rdv" NOT NULL,
	"jour_semaine" integer NOT NULL,
	"moment" "moment" NOT NULL,
	"capacite" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ordonnances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"prescripteur_id" uuid NOT NULL,
	"lignes" jsonb NOT NULL,
	"code_retrait" text NOT NULL,
	"emise_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ordonnances_code_retrait_unique" UNIQUE("code_retrait")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"foyer_id" uuid,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"date_naissance" date NOT NULL,
	"sexe" "sexe" NOT NULL,
	"langue" "langue" DEFAULT 'fon' NOT NULL,
	"canal_prefere" "canal" DEFAULT 'sms' NOT NULL,
	"malvoyant" boolean DEFAULT false NOT NULL,
	"malentendant" boolean DEFAULT false NOT NULL,
	"code_court" text NOT NULL,
	"etablissement_id" uuid NOT NULL,
	"mere_id" uuid,
	"antecedents" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patients_code_court_unique" UNIQUE("code_court")
);
--> statement-breakpoint
CREATE TABLE "rendez_vous" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"inscription_id" uuid,
	"etape_code" text,
	"motif" "motif_rdv" NOT NULL,
	"date_prevue" date NOT NULL,
	"moment" "moment",
	"creneau_id" uuid,
	"etablissement_id" uuid NOT NULL,
	"source" "source_rdv" NOT NULL,
	"reserve_le" timestamp with time zone,
	"annule_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responsables" (
	"compte_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"lien" "lien_responsable" NOT NULL,
	CONSTRAINT "responsables_compte_id_patient_id_pk" PRIMARY KEY("compte_id","patient_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"compte_id" uuid NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comptes" ADD CONSTRAINT "comptes_etablissement_id_etablissements_id_fk" FOREIGN KEY ("etablissement_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptes" ADD CONSTRAINT "comptes_commune_id_communes_id_fk" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consentements" ADD CONSTRAINT "consentements_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consentements" ADD CONSTRAINT "consentements_recueilli_par_comptes_id_fk" FOREIGN KEY ("recueilli_par") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contenus_traductions" ADD CONSTRAINT "contenus_traductions_contenu_id_contenus_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creneaux" ADD CONSTRAINT "creneaux_etablissement_id_etablissements_id_fk" FOREIGN KEY ("etablissement_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etablissements" ADD CONSTRAINT "etablissements_commune_id_communes_id_fk" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evenements" ADD CONSTRAINT "evenements_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evenements" ADD CONSTRAINT "evenements_auteur_id_comptes_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foyers" ADD CONSTRAINT "foyers_commune_id_communes_id_fk" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foyers" ADD CONSTRAINT "foyers_relais_id_comptes_id_fk" FOREIGN KEY ("relais_id") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modeles_plages" ADD CONSTRAINT "modeles_plages_etablissement_id_etablissements_id_fk" FOREIGN KEY ("etablissement_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordonnances" ADD CONSTRAINT "ordonnances_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordonnances" ADD CONSTRAINT "ordonnances_prescripteur_id_comptes_id_fk" FOREIGN KEY ("prescripteur_id") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_foyer_id_foyers_id_fk" FOREIGN KEY ("foyer_id") REFERENCES "public"."foyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_etablissement_id_etablissements_id_fk" FOREIGN KEY ("etablissement_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_mere_id_patients_id_fk" FOREIGN KEY ("mere_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_inscription_id_inscriptions_id_fk" FOREIGN KEY ("inscription_id") REFERENCES "public"."inscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_creneau_id_creneaux_id_fk" FOREIGN KEY ("creneau_id") REFERENCES "public"."creneaux"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_etablissement_id_etablissements_id_fk" FOREIGN KEY ("etablissement_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsables" ADD CONSTRAINT "responsables_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsables" ADD CONSTRAINT "responsables_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creneaux_unique" ON "creneaux" USING btree ("etablissement_id","motif","date","moment");