import { del, put } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { documentoAluno } from "@/lib/db/documento-aluno-schema";
import type { DOCUMENTO_ALUNO_MIME_TYPES } from "@/lib/db/documento-aluno-schema";

type DocumentoAlunoMimeType = (typeof DOCUMENTO_ALUNO_MIME_TYPES)[number];

export async function getDocumentosByAluno(alunoId: string) {
  return getDb()
    .select()
    .from(documentoAluno)
    .where(eq(documentoAluno.alunoId, alunoId))
    .orderBy(desc(documentoAluno.createdAt));
}

export async function getDocumentoAlunoById(id: string) {
  const [row] = await getDb()
    .select()
    .from(documentoAluno)
    .where(eq(documentoAluno.id, id))
    .limit(1);

  return row;
}

export async function createDocumentoAluno(input: {
  alunoId: string;
  titulo: string;
  descricao?: string;
  file: File;
  criadoPorId: string;
}) {
  const blob = await put(input.file.name, input.file, {
    access: "private",
    addRandomSuffix: true,
  });

  const [created] = await getDb()
    .insert(documentoAluno)
    .values({
      alunoId: input.alunoId,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      blobUrl: blob.url,
      nomeArquivo: input.file.name,
      mimeType: input.file.type as DocumentoAlunoMimeType,
      tamanhoBytes: input.file.size,
      criadoPorId: input.criadoPorId,
    })
    .returning();

  return created;
}

export async function deleteDocumentoAluno(id: string) {
  const row = await getDocumentoAlunoById(id);
  if (!row) return;

  await getDb().delete(documentoAluno).where(eq(documentoAluno.id, id));

  try {
    await del(row.blobUrl);
  } catch (error) {
    console.error(`Falha ao excluir blob do documento ${id}:`, error);
  }
}
