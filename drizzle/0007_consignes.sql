CREATE TABLE "consignes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"auteur_id" uuid NOT NULL,
	"texte" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consignes" ADD CONSTRAINT "consignes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignes" ADD CONSTRAINT "consignes_auteur_id_comptes_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;