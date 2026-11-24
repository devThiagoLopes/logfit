import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgresJs } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * O driver é escolhido pela própria `DATABASE_URL`: contra a Neon (produção
 * e preview) usamos `neon-http`, que fala o proxy HTTP da Neon. Contra um
 * Postgres comum (container local de dev ou de teste) usamos `postgres-js`
 * (TCP puro), já que `neon-http` não funciona fora do proxy da Neon.
 */
function createDb() {
  const databaseUrl =
    process.env.NODE_ENV === "test"
      ? process.env.DATABASE_URL_UNPOOLED!
      : process.env.DATABASE_URL!;

  if (databaseUrl.includes(".neon.tech")) {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  }

  const sql = postgres(databaseUrl);
  return drizzlePostgresJs(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
