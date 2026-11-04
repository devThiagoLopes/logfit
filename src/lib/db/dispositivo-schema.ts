import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const DISPOSITIVO_TIPOS = ["catraca", "vibracao"] as const;

export const dispositivo = pgTable("dispositivo", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text("nome").notNull(),
  local: text("local"),
  tipo: text("tipo", { enum: DISPOSITIVO_TIPOS }).default("catraca").notNull(),
  // Só se aplica a tipo "catraca": capacidade máxima de pessoas simultâneas
  // monitorada por esse dispositivo.
  lotacaoMaxima: integer("lotacao_maxima"),
  // Segredo usado pelo dispositivo/middleware do fabricante no header
  // Authorization: Bearer <token> das rotas de catraca. Mesmo padrão de
  // matricula.token: UUID gerado no banco, sem hashing.
  token: text("token")
    .notNull()
    .unique()
    .$defaultFn(() => crypto.randomUUID()),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type Dispositivo = typeof dispositivo.$inferSelect;
