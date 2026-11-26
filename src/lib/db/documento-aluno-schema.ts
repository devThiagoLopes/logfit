import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { aluno } from "@/lib/db/aluno-schema";
import { user } from "@/lib/db/auth-schema";

export const DOCUMENTO_ALUNO_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const documentoAluno = pgTable("documento_aluno", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  alunoId: text("aluno_id")
    .notNull()
    .references(() => aluno.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  // Arquivo não fica no banco: vai para o Vercel Blob (store privado).
  // blobUrl é usado para buscar/excluir o arquivo via SDK do @vercel/blob.
  blobUrl: text("blob_url").notNull(),
  nomeArquivo: text("nome_arquivo").notNull(),
  mimeType: text("mime_type", { enum: DOCUMENTO_ALUNO_MIME_TYPES }).notNull(),
  tamanhoBytes: integer("tamanho_bytes").notNull(),
  criadoPorId: text("criado_por_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DocumentoAluno = typeof documentoAluno.$inferSelect;
