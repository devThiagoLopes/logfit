import { and, asc, between, desc, eq, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { aluno } from "@/lib/db/aluno-schema";
import { matricula } from "@/lib/db/matricula-schema";
import { pagamento } from "@/lib/db/pagamento-schema";
import { plano } from "@/lib/db/plano-schema";
import {
  concluirPagamentoSchema,
  type ConcluirPagamentoInput,
} from "@/lib/validations/pagamento";
import { addMeses, renovarMatriculasAutomaticas } from "@/services/matriculas";

export class ParcelaAnteriorPendenteError extends Error {
  constructor() {
    super(
      "Existe uma parcela anterior pendente nesta matrícula. Confirme-a antes desta.",
    );
    this.name = "ParcelaAnteriorPendenteError";
  }
}

// ===== Helpers privados =====

// Gera as competências mensais que faltam para esta matrícula: a próxima
// parcela só nasce quando a última for paga (gera antes do vencimento) ou
// quando o vencimento da última já tiver passado (gera mesmo sem pagamento).
// Sem essas condições, não avança — e nada impede o acúmulo de pendentes.
async function gerarProximasCompetencias(matriculaRow: {
  id: string;
  dataInicio: Date;
  dataExpiracao: Date | null;
}) {
  const db = getDb();
  const agora = new Date();

  for (;;) {
    const [ultima] = await db
      .select({
        valor: pagamento.valor,
        status: pagamento.status,
        vencimento: pagamento.vencimento,
        numeroParcela: pagamento.numeroParcela,
      })
      .from(pagamento)
      .where(eq(pagamento.matriculaId, matriculaRow.id))
      .orderBy(desc(pagamento.numeroParcela))
      .limit(1);

    if (!ultima) return;

    const vencida = new Date(ultima.vencimento).getTime() < agora.getTime();
    const paga = ultima.status === "pago";
    if (!paga && !vencida) return;

    const proximoNumero = ultima.numeroParcela + 1;
    const proximoVencimento = addMeses(
      matriculaRow.dataInicio,
      proximoNumero - 1,
    );

    if (
      matriculaRow.dataExpiracao &&
      proximoVencimento > matriculaRow.dataExpiracao
    ) {
      return;
    }

    await db
      .insert(pagamento)
      .values({
        matriculaId: matriculaRow.id,
        valor: ultima.valor,
        vencimento: proximoVencimento,
        numeroParcela: proximoNumero,
      })
      .onConflictDoNothing();
  }
}

// ===== Consultas =====

export async function getPagamentos(periodo?: { inicio: Date; fim: Date }) {
  await gerarMensalidadesPendentes();

  return getDb()
    .select({
      id: pagamento.id,
      valor: pagamento.valor,
      status: pagamento.status,
      formaPagamento: pagamento.formaPagamento,
      vencimento: pagamento.vencimento,
      numeroParcela: pagamento.numeroParcela,
      pagoEm: pagamento.pagoEm,
      createdAt: pagamento.createdAt,
      matriculaId: matricula.id,
      periodicidade: matricula.periodicidade,
      alunoNome: aluno.nome,
      planoNome: plano.nome,
    })
    .from(pagamento)
    .innerJoin(matricula, eq(pagamento.matriculaId, matricula.id))
    .innerJoin(aluno, eq(matricula.alunoId, aluno.id))
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .where(
      periodo
        ? between(pagamento.vencimento, periodo.inicio, periodo.fim)
        : undefined,
    )
    .orderBy(desc(pagamento.vencimento), desc(pagamento.numeroParcela));
}

export async function getPagamentosByMatricula(matriculaId: string) {
  await gerarMensalidadesPendentes(matriculaId);

  return getDb()
    .select({
      id: pagamento.id,
      valor: pagamento.valor,
      status: pagamento.status,
      formaPagamento: pagamento.formaPagamento,
      vencimento: pagamento.vencimento,
      numeroParcela: pagamento.numeroParcela,
      pagoEm: pagamento.pagoEm,
      createdAt: pagamento.createdAt,
    })
    .from(pagamento)
    .where(eq(pagamento.matriculaId, matriculaId))
    .orderBy(asc(pagamento.numeroParcela));
}

// Usada pela autorização de acesso da catraca: mesmo com o contrato
// assinado, o aluno só fica "ativo" de fato depois que a primeira parcela é
// confirmada — antes disso a matrícula está pendente de pagamento.
export async function temPrimeiraParcelaPendente(matriculaId: string) {
  const [row] = await getDb()
    .select({ id: pagamento.id })
    .from(pagamento)
    .where(
      and(
        eq(pagamento.matriculaId, matriculaId),
        eq(pagamento.numeroParcela, 1),
        eq(pagamento.status, "pendente"),
      ),
    )
    .limit(1);

  return Boolean(row);
}

// Usada pela autorização de acesso da catraca: parcela pendente cujo
// vencimento já passou, independente de regenerar mensalidades antes.
export async function temPagamentoAtrasado(alunoId: string) {
  const [row] = await getDb()
    .select({ id: pagamento.id })
    .from(pagamento)
    .innerJoin(matricula, eq(pagamento.matriculaId, matricula.id))
    .where(
      and(
        eq(matricula.alunoId, alunoId),
        eq(pagamento.status, "pendente"),
        lt(pagamento.vencimento, new Date()),
      ),
    )
    .limit(1);

  return Boolean(row);
}

// Lista (não apenas booleano, ao contrário de temPagamentoAtrasado) usada
// pelo painel de pendências do dashboard.
export async function getPagamentosAtrasados() {
  return getDb()
    .select({
      id: pagamento.id,
      valor: pagamento.valor,
      vencimento: pagamento.vencimento,
      matriculaId: pagamento.matriculaId,
      alunoNome: aluno.nome,
    })
    .from(pagamento)
    .innerJoin(matricula, eq(pagamento.matriculaId, matricula.id))
    .innerJoin(aluno, eq(matricula.alunoId, aluno.id))
    .where(and(eq(pagamento.status, "pendente"), lt(pagamento.vencimento, new Date())))
    .orderBy(asc(pagamento.vencimento));
}

// ===== Mutações =====

export async function concluirPagamento(
  id: string,
  input: ConcluirPagamentoInput,
) {
  const data = concluirPagamentoSchema.parse(input);
  const db = getDb();

  const [atual] = await db
    .select({
      matriculaId: pagamento.matriculaId,
      numeroParcela: pagamento.numeroParcela,
      status: pagamento.status,
    })
    .from(pagamento)
    .where(eq(pagamento.id, id))
    .limit(1);

  if (!atual || atual.status !== "pendente") return undefined;

  const [anteriorPendente] = await db
    .select({ id: pagamento.id })
    .from(pagamento)
    .where(
      and(
        eq(pagamento.matriculaId, atual.matriculaId),
        lt(pagamento.numeroParcela, atual.numeroParcela),
        eq(pagamento.status, "pendente"),
      ),
    )
    .limit(1);

  if (anteriorPendente) {
    throw new ParcelaAnteriorPendenteError();
  }

  const [updated] = await db
    .update(pagamento)
    .set({
      status: "pago",
      formaPagamento: data.formaPagamento,
      pagoEm: new Date(),
    })
    .where(and(eq(pagamento.id, id), eq(pagamento.status, "pendente")))
    .returning();

  if (updated) {
    await gerarMensalidadesPendentes(updated.matriculaId);
  }

  return updated;
}

export async function gerarMensalidadesPendentes(matriculaId?: string) {
  // Estende dataExpiracao e gera o pagamento do próximo ciclo para
  // matrículas (mensais e anuais) com renovação automática que já venceram.
  // Precisa rodar antes do select abaixo: só assim o teto de dataExpiracao
  // já vem atualizado para o loop de competências mensais que segue.
  await renovarMatriculasAutomaticas(matriculaId);

  const db = getDb();
  const agora = new Date();

  const condicoes = [
    eq(matricula.periodicidade, "mensal"),
    eq(matricula.status, "assinada"),
  ];
  if (matriculaId) condicoes.push(eq(matricula.id, matriculaId));

  const matriculas = await db
    .select({
      id: matricula.id,
      dataInicio: matricula.dataInicio,
      dataExpiracao: matricula.dataExpiracao,
    })
    .from(matricula)
    .where(and(...condicoes));

  for (const item of matriculas) {
    if (item.dataExpiracao && item.dataExpiracao.getTime() < agora.getTime()) {
      continue;
    }
    await gerarProximasCompetencias(item);
  }
}
