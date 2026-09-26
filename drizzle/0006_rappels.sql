CREATE TABLE "rappels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"rendez_vous_id" uuid NOT NULL,
	"canal" "canal" NOT NULL,
	"telephone" text,
	"contenu" text NOT NULL,
	"envoye_le" timestamp with time zone NOT NULL,
	"statut" text DEFAULT 'envoye' NOT NULL,
	"reponse" text,
	"repondu_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rappels" ADD CONSTRAINT "rappels_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rappels" ADD CONSTRAINT "rappels_rendez_vous_id_rendez_vous_id_fk" FOREIGN KEY ("rendez_vous_id") REFERENCES "public"."rendez_vous"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rappels_rendez_vous_canal" ON "rappels" USING btree ("rendez_vous_id","canal");