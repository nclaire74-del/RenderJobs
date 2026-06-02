import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Charge .env.local (non versionné) pour récupérer DATABASE_URL hors runtime Next.
config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant (.env.local) pour drizzle-kit.");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
