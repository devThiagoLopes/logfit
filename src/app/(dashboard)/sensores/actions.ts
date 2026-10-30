"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/permissions";
import {
  createDispositivo,
  deleteDispositivo,
  regenerarTokenDispositivo,
  toggleAtivoDispositivo,
  updateDispositivo,
} from "@/services/dispositivos";
import {
  createDispositivoSchema,
  type CreateDispositivoFormInput,
} from "@/lib/validations/dispositivo";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  return hasRole(session?.user, ["admin"]);
}

export async function createDispositivoAction(
  input: CreateDispositivoFormInput,
) {
  if (!(await requireAdmin())) {
    return { error: "Você não tem permissão para cadastrar dispositivos." };
  }

  const parsed = createDispositivoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await createDispositivo(parsed.data);
  } catch {
    return { error: "Erro ao cadastrar dispositivo." };
  }

  revalidatePath("/sensores");
  return { success: true };
}

export async function updateDispositivoAction(
  id: string,
  input: CreateDispositivoFormInput,
) {
  if (!(await requireAdmin())) {
    return { error: "Você não tem permissão para editar dispositivos." };
  }

  const parsed = createDispositivoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await updateDispositivo(id, parsed.data);
  } catch {
    return { error: "Erro ao atualizar dispositivo." };
  }

  revalidatePath("/sensores");
  return { success: true };
}

export async function toggleAtivoDispositivoAction(
  id: string,
  ativo: boolean,
) {
  if (!(await requireAdmin())) {
    return { error: "Você não tem permissão para alterar este dispositivo." };
  }

  try {
    await toggleAtivoDispositivo(id, ativo);
  } catch {
    return { error: "Erro ao atualizar dispositivo." };
  }

  revalidatePath("/sensores");
  return { success: true };
}

export async function regenerarTokenDispositivoAction(id: string) {
  if (!(await requireAdmin())) {
    return { error: "Você não tem permissão para alterar este dispositivo." };
  }

  try {
    const atualizado = await regenerarTokenDispositivo(id);
    if (!atualizado) {
      return { error: "Dispositivo não encontrado." };
    }

    revalidatePath("/sensores");
    return { success: true as const, token: atualizado.token };
  } catch {
    return { error: "Erro ao gerar novo token." };
  }
}

export async function deleteDispositivoAction(id: string) {
  if (!(await requireAdmin())) {
    return { error: "Você não tem permissão para excluir dispositivos." };
  }

  try {
    await deleteDispositivo(id);
  } catch {
    return {
      error:
        "Não é possível excluir este dispositivo: existem check-ins registrados por ele.",
    };
  }

  revalidatePath("/sensores");
  return { success: true };
}
