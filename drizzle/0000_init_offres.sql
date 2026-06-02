CREATE TABLE "offres" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"url" text NOT NULL,
	"titre" text NOT NULL,
	"studio" text,
	"pays" text,
	"ville" text,
	"latitude" double precision,
	"longitude" double precision,
	"mode_travail" text,
	"contrat" text,
	"experience" text,
	"logiciels" text[] DEFAULT '{}' NOT NULL,
	"specialites" text[] DEFAULT '{}' NOT NULL,
	"salaire" text,
	"publie_le" timestamp with time zone,
	"recupere_le" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	CONSTRAINT "offres_source_source_id_unique" UNIQUE("source","source_id")
);
--> statement-breakpoint
CREATE INDEX "offres_publie_le_idx" ON "offres" USING btree ("publie_le");