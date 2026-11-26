import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/permissions";
import { FUNCIONARIO_ROLES } from "@/constants/roles";
import { getDocumentoAlunoById } from "@/services/documentos-aluno";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentoId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!hasRole(session?.user, [...FUNCIONARIO_ROLES])) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const { documentoId } = await params;
  const documento = await getDocumentoAlunoById(documentoId);
  if (!documento) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const result = await get(documento.blobUrl, { access: "private" });
  if (result?.statusCode !== 200) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": documento.mimeType,
      "Content-Disposition": `inline; filename="${documento.nomeArquivo}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
