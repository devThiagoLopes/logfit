import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { aluno } from "@/lib/db/aluno-schema";
import { dispositivo } from "@/lib/db/dispositivo-schema";

export const CHECKIN_IDENTIFICADOR_TIPOS = ["matricula", "cpf"] as const;
export const CHECKIN_SENTIDOS = ["entrada", "saida"] as const;

export const checkin = pgTable("checkin", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  dispositivoId: text("dispositivo_id")
    .notNull()
    .references(() => dispositivo.id),
  // Nullable: um check-in é sempre registrado, mesmo quando o identificador
  // recebido não casa com nenhum aluno cadastrado (auditoria não pode se
  // perder). onDelete "set null" porque excluir o aluno não deve apagar o
  // histórico de acessos já ocorridos.
  alunoId: text("aluno_id").references(() => aluno.id, {
    onDelete: "set null",
  }),
  identificadorTipo: text("identificador_tipo", {
    enum: CHECKIN_IDENTIFICADOR_TIPOS,
  }).notNull(),
  identificadorValor: text("identificador_valor").notNull(),
  liberado: boolean("liberado").notNull(),
  motivo: text("motivo"),
  // Opcional: nem toda catraca reporta o sentido do acesso.
  sentido: text("sentido", { enum: CHECKIN_SENTIDOS }),
  // Horário reportado pelo dispositivo. Separado de createdAt porque o
  // middleware da catraca pode ficar offline e reenviar eventos em lote
  // depois — o histórico é ordenado por ocorridoEm, não por chegada.
  ocorridoEm: timestamp("ocorrido_em").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Checkin = typeof checkin.$inferSelect;
