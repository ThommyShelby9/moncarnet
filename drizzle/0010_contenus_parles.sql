ALTER TABLE "contenus" ADD COLUMN "titre" text;--> statement-breakpoint
ALTER TABLE "contenus_traductions" ADD COLUMN "audio" "bytea";--> statement-breakpoint
ALTER TABLE "contenus_traductions" ADD COLUMN "audio_type" text;--> statement-breakpoint
ALTER TABLE "contenus_traductions" ADD COLUMN "audio_le" timestamp with time zone;