/**
 * Client Drizzle + pool Postgres (port 5434, base `hub_emploi`).
 * La chaîne de connexion vient de `DATABASE_URL` (`.env.local`).
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL manquant. Renseigner la chaîne Postgres dans .env.local.",
  );
}

// Pool unique réutilisé entre les rechargements (dev) pour éviter d'épuiser les connexions.
const globalForDb = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForDb.__pgPool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = pool;

export const db = drizzle(pool, { schema });
