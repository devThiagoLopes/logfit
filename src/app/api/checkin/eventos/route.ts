import { NextResponse } from "next/server";

import { autenticarDispositivo } from "@/services/dispositivos";
import { registrarCheckin } from "@/services/checkins";
import { registrarCheckinSchema } from "@/lib/validations/checkin";

// Rota pública para o dispositivo/middleware de catraca, autenticada só pelo
// token do dispositivo (Bearer) — não passa por sessão/RBAC do Better Auth.
// Não recalcula a regra de autorização: só registra o que o dispositivo
// reportou ter acontecido.
export async function POST(request: Request) {
  const dispositivo = await autenticarDispositivo(
    request.headers.get("authorization"),
  );
  if (!dispositivo) {
    return NextResponse.json(
      { error: "Dispositivo não autorizado." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registrarCheckinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const created = await registrarCheckin(dispositivo.id, parsed.data);
  return NextResponse.json({ success: true, id: created.id });
}
