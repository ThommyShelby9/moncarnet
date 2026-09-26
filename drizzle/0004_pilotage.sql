CREATE TABLE "indicateurs_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone" text NOT NULL,
	"departement" text NOT NULL,
	"mois" date NOT NULL,
	"code" text NOT NULL,
	"numerateur" integer NOT NULL,
	"denominateur" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communes" ADD COLUMN "zone_sanitaire" text;--> statement-breakpoint
CREATE UNIQUE INDEX "indicateurs_zones_unique" ON "indicateurs_zones" USING btree ("zone","mois","code");