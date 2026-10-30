"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/permissions";
import {
  concluirPagamento,
  ParcelaAnteriorPendenteError,
} from "@/services/pagamentos";
import {
  concluirPagamentoSchema,
  type ConcluirPagamentoFormInput,
} from "@/lib/validations/pagamento";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  return hasRole(session?.user, ["admin"]);
}

export async function concluirPagamentoAction(
  id: string,
  input: ConcluirPagamentoFormInput,
) {
  if (!(await requireAdmin())) {
    return { error: "Você não tem permissão para concluir pagamentos." };
  }

  const parsed = concluirPagamentoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let updated;
  try {
    updated = await concluirPagamento(id, parsed.data);
  } catch (error) {
    if (error instanceof ParcelaAnteriorPendenteError) {
      return { error: error.message };
    }
    return { error: "Erro ao concluir pagamento." };
  }

  if (!updated) {
    return { error: "Pagamento não encontrado ou já concluído." };
  }

  revalidatePath("/pagamentos");
  revalidatePath("/matriculas");
  revalidatePath("/alunos");
  return { success: true };
}
