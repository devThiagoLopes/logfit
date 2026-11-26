"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/permissions";
import { FUNCIONARIO_ROLES } from "@/constants/roles";
import {
  createDocumentoAluno,
  deleteDocumentoAluno,
  getDocumentoAlunoById,
} from "@/services/documentos-aluno";
import {
  createDocumentoAlunoSchema,
  validarArquivoDocumentoAluno,
} from "@/lib/validations/documento-aluno";

async function requireFuncionarioSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!hasRole(session?.user, [...FUNCIONARIO_ROLES])) return null;
  return session;
}

export async function uploadDocumentoAlunoAction(
  alunoId: string,
  formData: FormData,
) {
  const session = await requireFuncionarioSession();
  if (!session) {
    return { error: "Você não tem permissão para anexar documentos." };
  }

  const parsed = createDocumentoAlunoSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo para anexar." };
  }

  const fileError = validarArquivoDocumentoAluno(file);
  if (fileError) {
    return { error: fileError };
  }

  try {
    await createDocumentoAluno({
      alunoId,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      file,
      criadoPorId: session.user.id,
    });
  } catch {
    return { error: "Erro ao anexar documento." };
  }

  revalidatePath(`/alunos/${alunoId}`);
  return { success: true };
}

export async function deleteDocumentoAlunoAction(
  id: string,
  alunoId: string,
) {
  const session = await requireFuncionarioSession();
  if (!session) {
    return { error: "Você não tem permissão para excluir documentos." };
  }

  const documento = await getDocumentoAlunoById(id);
  if (!documento || documento.alunoId !== alunoId) {
    return { error: "Documento não encontrado." };
  }

  try {
    await deleteDocumentoAluno(id);
  } catch {
    return { error: "Erro ao excluir documento." };
  }

  revalidatePath(`/alunos/${alunoId}`);
  return { success: true };
}
