// Lógica pura de situação de matrícula, sem dependência do banco —
// importável por Client Components (ex: matricula-signature-panel.tsx)
// sem arrastar o driver `postgres` para o bundle do browser.

export const MATRICULA_SITUACOES = [
  "aguardando_assinatura",
  "ativa",
  "expirada",
  "cancelada",
] as const;

export type MatriculaSituacao = (typeof MATRICULA_SITUACOES)[number];

// Situação é calculada, não armazenada: o `status` da matrícula só
// controla o fluxo de assinatura/cancelamento; a expiração depende apenas de
// `dataExpiracao` ter passado ou não em relação a agora.
export function getSituacaoMatricula(
  status: string,
  dataExpiracao: Date | string | null,
): MatriculaSituacao {
  if (status === "cancelada") return "cancelada";
  if (status !== "assinada") return "aguardando_assinatura";
  if (dataExpiracao && new Date(dataExpiracao).getTime() < Date.now()) {
    return "expirada";
  }
  return "ativa";
}

export const PRAZO_REABERTURA_DIAS = 10;

export function podeReabrirMatricula(
  status: string,
  canceladaEm: Date | string | null,
) {
  if (status !== "cancelada" || !canceladaEm) return false;

  const limite = new Date(canceladaEm);
  limite.setDate(limite.getDate() + PRAZO_REABERTURA_DIAS);
  return Date.now() <= limite.getTime();
}
