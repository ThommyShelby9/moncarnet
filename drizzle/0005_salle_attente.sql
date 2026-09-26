CREATE TABLE "passages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etablissement_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"jour" date NOT NULL,
	"numero" integer NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"arrive_le" timestamp with time zone NOT NULL,
	"appele_le" timestamp with time zone,
	"appele_par" uuid
);
--> statement-breakpoint
ALTER TABLE "passages" ADD CONSTRAINT "passages_etablissement_id_etablissements_id_fk" FOREIGN KEY ("etablissement_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passages" ADD CONSTRAINT "passages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passages" ADD CONSTRAINT "passages_appele_par_comptes_id_fk" FOREIGN KEY ("appele_par") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "passages_numero" ON "passages" USING btree ("etablissement_id","jour","numero");--> statement-breakpoint
CREATE UNIQUE INDEX "passages_patient" ON "passages" USING btree ("etablissement_id","jour","patient_id");