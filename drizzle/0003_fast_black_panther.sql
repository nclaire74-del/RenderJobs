CREATE INDEX "offres_logiciels_gin" ON "offres" USING gin ("logiciels");--> statement-breakpoint
CREATE INDEX "offres_specialites_gin" ON "offres" USING gin ("specialites");