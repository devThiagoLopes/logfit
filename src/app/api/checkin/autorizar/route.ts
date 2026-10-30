import { NextResponse } from "next/server";

import { autenticarDispositivo } from "@/services/dispositivos";
import { autorizarAcesso } from "@/services/checkins";
import { autorizarAcessoSchema } from "@/lib/validations/checkin";

// Rota pública para o dispositivo/middleware de catraca, autenticada só pelo
// token do dispositivo (Bearer) — não passa por sessão/RBAC do Better Auth.
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
  const parsed = autorizarAcessoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const resultado = await autorizarAcesso(parsed.data);
  return NextResponse.json(resultado);
}
