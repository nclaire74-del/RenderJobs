ALTER TABLE "offres" ADD COLUMN "cle_dedup" text;--> statement-breakpoint
CREATE INDEX "offres_cle_dedup_idx" ON "offres" USING btree ("cle_dedup");