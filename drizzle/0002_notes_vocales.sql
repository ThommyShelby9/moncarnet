CREATE TABLE "fichiers" (
	"evenement_id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"taille" integer NOT NULL,
	"donnees" "bytea" NOT NULL,
	"recu_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fichiers" ADD CONSTRAINT "fichiers_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE cascade ON UPDATE no action;