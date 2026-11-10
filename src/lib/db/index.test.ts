import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";

async function queryRows(query: ReturnType<typeof sql>) {
  const result = await getDb().execute(query);
  return result as unknown as Record<string, unknown>[];
}

describe("conexão com o banco", () => {
  it("executa uma query simples contra o Postgres de teste", async () => {
    const rows = await queryRows(sql`select 1 as ok`);

    expect(rows[0]).toEqual({ ok: 1 });
  });

  it("tem as migrations aplicadas (tabela de planos existe)", async () => {
    const rows = await queryRows(
      sql`select to_regclass('public.plano') as tabela`,
    );

    expect(rows[0].tabela).toBe("plano");
  });
});
