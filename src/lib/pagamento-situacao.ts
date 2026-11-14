// Lógica pura de situação de pagamento, sem dependência do banco — mesma
// ideia de matricula-situacao.ts: testável sem banco e segura para importar
// num Client Component sem arrastar o driver `postgres` para o bundle.

export const PAGAMENTO_SITUACOES = ["pendente", "atrasado", "pago"] as const;

export type PagamentoSituacao = (typeof PAGAMENTO_SITUACOES)[number];

export function inicioDoDia(referencia: Date = new Date()) {
  const data = new Date(referencia);
  data.setHours(0, 0, 0, 0);
  return data;
}

// Atraso é contado por dia civil, não pelo horário exato do vencimento: um
// pagamento só passa a contar como atrasado a partir do dia SEGUINTE ao
// vencimento — no próprio dia (independente da hora) ainda está em dia.
export function estaVencido(vencimento: Date | string) {
  return new Date(vencimento).getTime() < inicioDoDia().getTime();
}

export function getSituacaoPagamento(
  status: string,
  vencimento: Date | string,
): PagamentoSituacao {
  if (status === "pago") return "pago";
  return estaVencido(vencimento) ? "atrasado" : "pendente";
}
