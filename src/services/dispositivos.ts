import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { dispositivo } from "@/lib/db/dispositivo-schema";
import {
  createDispositivoSchema,
  type CreateDispositivoInput,
} from "@/lib/validations/dispositivo";

export async function getDispositivos() {
  return getDb().select().from(dispositivo).orderBy(desc(dispositivo.createdAt));
}

export async function getDispositivoById(id: string) {
  const [row] = await getDb()
    .select()
    .from(dispositivo)
    .where(eq(dispositivo.id, id))
    .limit(1);

  return row;
}

export async function createDispositivo(input: CreateDispositivoInput) {
  const data = createDispositivoSchema.parse(input);

  const [created] = await getDb()
    .insert(dispositivo)
    .values({ nome: data.nome, local: data.local ?? null })
    .returning();

  return created;
}

export async function updateDispositivo(
  id: string,
  input: CreateDispositivoInput,
) {
  const data = createDispositivoSchema.parse(input);

  const [updated] = await getDb()
    .update(dispositivo)
    .set({ nome: data.nome, local: data.local ?? null })
    .where(eq(dispositivo.id, id))
    .returning();

  return updated;
}

export async function toggleAtivoDispositivo(id: string, ativo: boolean) {
  const [updated] = await getDb()
    .update(dispositivo)
    .set({ ativo })
    .where(eq(dispositivo.id, id))
    .returning();

  return updated;
}

export async function regenerarTokenDispositivo(id: string) {
  const [updated] = await getDb()
    .update(dispositivo)
    .set({ token: crypto.randomUUID() })
    .where(eq(dispositivo.id, id))
    .returning();

  return updated;
}

export async function deleteDispositivo(id: string) {
  await getDb().delete(dispositivo).where(eq(dispositivo.id, id));
}

// Autentica o dispositivo chamador das rotas de catraca a partir do header
// Authorization: Bearer <token>. Não tem relação com sessão/RBAC do Better
// Auth — é um segredo próprio do device, não de um usuário humano.
export async function autenticarDispositivo(
  authorizationHeader: string | null,
) {
  const token = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const [row] = await getDb()
    .select()
    .from(dispositivo)
    .where(and(eq(dispositivo.token, token), eq(dispositivo.ativo, true)))
    .limit(1);

  return row ?? null;
}
