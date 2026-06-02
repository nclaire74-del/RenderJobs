ALTER TABLE "offres" ADD COLUMN "pertinence" text DEFAULT 'connexe' NOT NULL;--> statement-breakpoint
ALTER TABLE "offres" ADD COLUMN "langue" text;--> statement-breakpoint
CREATE INDEX "offres_pertinence_publie_le_idx" ON "offres" USING btree ("pertinence","publie_le");