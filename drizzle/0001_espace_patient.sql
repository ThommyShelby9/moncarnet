CREATE TYPE "public"."statut_attente" AS ENUM('en_attente', 'proposee', 'acceptee', 'expiree', 'annulee');--> statement-breakpoint
CREATE TABLE "alertes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"evenement_id" uuid NOT NULL,
	"etablissement_id" uuid NOT NULL,
	"creee_le" timestamp with time zone DEFAULT now() NOT NULL,
	"echeance" timestamp with time zone NOT NULL,
	"prise_en_charge_par" uuid,
	"prise_en_charge_le" timestamp with time zone,
	"remontee_le" timestamp with time zone,
	"annulee_le" timestamp with time zone,
	CONSTRAINT "alertes_evenement_id_unique" UNIQUE("evenement_id")
);
--> statement-breakpoint
CREATE TABLE "liste_attente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"etablissement_id" uuid NOT NULL,
	"motif" "motif_rdv" NOT NULL,
	"date_souhaitee" date NOT NULL,
	"moment" "moment" NOT NULL,
	"statut" "statut_attente" DEFAULT 'en_attente' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"propose_le" timestamp with time zone,
	"expire_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_etablissement_id_etablissements_id_fk" FOREIGN KEY ("etablissement_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_prise_en_charge_par_comptes_id_fk" FOREIGN KEY ("prise_en_charge_par") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liste_attente" ADD CONSTRAINT "liste_attente_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liste_attente" ADD CONSTRAINT "liste_attente_etablissement_id_etablissements_id_fk" FOREIGN KEY ("etablissement_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;