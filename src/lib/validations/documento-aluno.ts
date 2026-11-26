import { z } from "zod";

import { DOCUMENTO_ALUNO_MIME_TYPES } from "@/lib/db/documento-aluno-schema";

export { DOCUMENTO_ALUNO_MIME_TYPES };

export const DOCUMENTO_ALUNO_MAX_BYTES = 10 * 1024 * 1024;

export const createDocumentoAlunoSchema = z.object({
  titulo: z.string().trim().min(1, "Informe um título").max(120),
  descricao: z
    .string()
    .trim()
    .max(500, "Máximo de 500 caracteres")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CreateDocumentoAlunoFormInput = z.input<
  typeof createDocumentoAlunoSchema
>;
export type CreateDocumentoAlunoInput = z.infer<
  typeof createDocumentoAlunoSchema
>;

export function validarArquivoDocumentoAluno(file: File) {
  if (!DOCUMENTO_ALUNO_MIME_TYPES.includes(file.type as never)) {
    return "Tipo de arquivo não permitido. Envie um PDF ou imagem (JPG, PNG, WEBP).";
  }
  if (file.size > DOCUMENTO_ALUNO_MAX_BYTES) {
    return "Arquivo muito grande. O tamanho máximo é 10 MB.";
  }
  return null;
}
