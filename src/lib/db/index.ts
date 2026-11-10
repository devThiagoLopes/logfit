import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgresJs } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Em `NODE_ENV=test` usamos o driver `postgres-js` (Postgres via TCP) contra
 * o container do `docker-compose.test.yml`, já que o driver `neon-http` só
 * fala com o proxy HTTP da Neon e não funciona com um Postgres comum.
 */
function createDb() {
  if (process.env.NODE_ENV === "test") {
    const sql = postgres(process.env.DATABASE_URL_UNPOOLED!);
    return drizzlePostgresJs(sql, { schema });
  }

  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
