CREATE TABLE "ruptures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacie_id" uuid NOT NULL,
	"medicament" text NOT NULL,
	"auteur_id" uuid NOT NULL,
	"signalee_le" timestamp with time zone DEFAULT now() NOT NULL,
	"finie_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ruptures" ADD CONSTRAINT "ruptures_pharmacie_id_etablissements_id_fk" FOREIGN KEY ("pharmacie_id") REFERENCES "public"."etablissements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruptures" ADD CONSTRAINT "ruptures_auteur_id_comptes_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;