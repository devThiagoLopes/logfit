import { and, asc, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { aluno } from "@/lib/db/aluno-schema";
import { matricula } from "@/lib/db/matricula-schema";
import {
  MATRICULA_HISTORICO_TIPOS,
  matriculaHistorico,
} from "@/lib/db/matricula-historico-schema";
import { pagamento } from "@/lib/db/pagamento-schema";
import { plano } from "@/lib/db/plano-schema";
import { FORMAS_PAGAMENTO_OPCOES } from "@/constants/forma-pagamento";
import {
  mesesDaPeriodicidade,
  PERIODICIDADES_COM_RENOVACAO_AUTOMATICA,
  type PeriodicidadeKey,
} from "@/constants/periodicidade";
import {
  assinarMatriculaSchema,
  createMatriculaSchema,
  type AssinarMatriculaInput,
  type CreateMatriculaInput,
} from "@/lib/validations/matricula";

// ===== Constantes =====

export {
  MATRICULA_SITUACOES,
  getSituacaoMatricula,
  PRAZO_REABERTURA_DIAS,
  podeReabrirMatricula,
  type MatriculaSituacao,
} from "@/lib/matricula-situacao";
import {
  MATRICULA_SITUACOES,
  PRAZO_REABERTURA_DIAS,
  getSituacaoMatricula,
  type MatriculaSituacao,
} from "@/lib/matricula-situacao";

// Situação exibida nas telas: igual à situação de negócio, exceto que
// "ativa" com a primeira parcela ainda pendente aparece como "pendente" —
// contrato assinado não é suficiente, só conta como ativa de fato depois do
// primeiro pagamento (mesma regra usada na autorização de acesso da catraca).
export type MatriculaSituacaoExibicao = MatriculaSituacao | "pendente";

export function getSituacaoExibicao(
  situacao: MatriculaSituacao,
  primeiraParcelaPendente: boolean,
): MatriculaSituacaoExibicao {
  return situacao === "ativa" && primeiraParcelaPendente
    ? "pendente"
    : situacao;
}

// ===== Erros de domínio =====

export class MatriculaAtivaError extends Error {
  constructor() {
    super("Este aluno já possui uma matrícula ativa.");
    this.name = "MatriculaAtivaError";
  }
}

export class MatriculaJaCanceladaError extends Error {
  constructor() {
    super("Esta matrícula já está cancelada.");
    this.name = "MatriculaJaCanceladaError";
  }
}

export class MatriculaNaoCanceladaError extends Error {
  constructor() {
    super("Esta matrícula não está cancelada.");
    this.name = "MatriculaNaoCanceladaError";
  }
}

export class PrazoReaberturaExpiradoError extends Error {
  constructor() {
    super(
      `O prazo de ${PRAZO_REABERTURA_DIAS} dias para reabrir esta matrícula já expirou.`,
    );
    this.name = "PrazoReaberturaExpiradoError";
  }
}

export class MatriculaAtivaAoReabrirError extends Error {
  constructor() {
    super(
      "Este aluno já possui outra matrícula ativa, não é possível reabrir.",
    );
    this.name = "MatriculaAtivaAoReabrirError";
  }
}

export class MatriculaNaoElegivelParaRenovacaoError extends Error {
  constructor() {
    super(
      "Esta matrícula não pode ser renovada (periodicidade diária, não assinada ou sem data de expiração).",
    );
    this.name = "MatriculaNaoElegivelParaRenovacaoError";
  }
}

export class MatriculaAindaNaoVencidaError extends Error {
  constructor() {
    super("Esta matrícula ainda não venceu, não há rematrícula a confirmar.");
    this.name = "MatriculaAindaNaoVencidaError";
  }
}

export class RenovacaoJaAutomaticaError extends Error {
  constructor() {
    super(
      "Esta matrícula já está em rematrícula automática; não é necessário confirmar manualmente.",
    );
    this.name = "RenovacaoJaAutomaticaError";
  }
}

export class PeriodicidadeNaoRenovavelError extends Error {
  constructor() {
    super(
      "Esta periodicidade não participa da rematrícula automática; confirme manualmente quando vencer.",
    );
    this.name = "PeriodicidadeNaoRenovavelError";
  }
}

// ===== Helpers privados =====

export function addMeses(data: Date, meses: number) {
  const resultado = new Date(data);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}

// Divide o valor total em N parcelas de centavos iguais, ajustando a
// última para absorver o resto da divisão e manter a soma exata.
function dividirEmParcelas(valorTotal: string, quantidade: number) {
  const totalCentavos = Math.round(Number(valorTotal) * 100);
  const parcelaCentavos = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos - parcelaCentavos * quantidade;

  return Array.from({ length: quantidade }, (_, index) => {
    const centavos = parcelaCentavos + (index < resto ? 1 : 0);
    return (centavos / 100).toFixed(2);
  });
}

// ===== Consultas =====

export async function getMatriculas(filtro?: { planoId?: string }) {
  return getDb()
    .select({
      id: matricula.id,
      status: matricula.status,
      periodicidade: matricula.periodicidade,
      token: matricula.token,
      assinaturaNome: matricula.assinaturaNome,
      assinadoEm: matricula.assinadoEm,
      dataExpiracao: matricula.dataExpiracao,
      canceladaEm: matricula.canceladaEm,
      createdAt: matricula.createdAt,
      alunoNome: aluno.nome,
      planoId: plano.id,
      planoNome: plano.nome,
      primeiraParcelaStatus: pagamento.status,
    })
    .from(matricula)
    .innerJoin(aluno, eq(matricula.alunoId, aluno.id))
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .leftJoin(
      pagamento,
      and(
        eq(pagamento.matriculaId, matricula.id),
        eq(pagamento.numeroParcela, 1),
      ),
    )
    .where(filtro?.planoId ? eq(matricula.planoId, filtro.planoId) : undefined)
    .orderBy(desc(matricula.createdAt));
}

export async function getMatriculaById(id: string) {
  const [row] = await getDb()
    .select({
      id: matricula.id,
      status: matricula.status,
      periodicidade: matricula.periodicidade,
      renovacaoAutomatica: matricula.renovacaoAutomatica,
      token: matricula.token,
      assinaturaNome: matricula.assinaturaNome,
      assinaturaImagem: matricula.assinaturaImagem,
      assinadoEm: matricula.assinadoEm,
      dataInicio: matricula.dataInicio,
      dataExpiracao: matricula.dataExpiracao,
      canceladaEm: matricula.canceladaEm,
      createdAt: matricula.createdAt,
      alunoNome: aluno.nome,
      alunoTelefone: aluno.telefone,
      planoNome: plano.nome,
    })
    .from(matricula)
    .innerJoin(aluno, eq(matricula.alunoId, aluno.id))
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .where(eq(matricula.id, id))
    .limit(1);

  return row;
}

export async function getMatriculaByToken(token: string) {
  const [row] = await getDb()
    .select({
      id: matricula.id,
      status: matricula.status,
      periodicidade: matricula.periodicidade,
      anamnese: matricula.anamnese,
      assinaturaNome: matricula.assinaturaNome,
      assinaturaImagem: matricula.assinaturaImagem,
      assinadoEm: matricula.assinadoEm,
      dataInicio: matricula.dataInicio,
      dataExpiracao: matricula.dataExpiracao,
      createdAt: matricula.createdAt,
      aluno,
      plano,
    })
    .from(matricula)
    .innerJoin(aluno, eq(matricula.alunoId, aluno.id))
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .where(eq(matricula.token, token))
    .limit(1);

  return row;
}

export async function getMatriculasByAluno(alunoId: string) {
  return getDb()
    .select({
      id: matricula.id,
      status: matricula.status,
      periodicidade: matricula.periodicidade,
      dataExpiracao: matricula.dataExpiracao,
      createdAt: matricula.createdAt,
      planoNome: plano.nome,
      primeiraParcelaStatus: pagamento.status,
    })
    .from(matricula)
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .leftJoin(
      pagamento,
      and(
        eq(pagamento.matriculaId, matricula.id),
        eq(pagamento.numeroParcela, 1),
      ),
    )
    .where(eq(matricula.alunoId, alunoId))
    .orderBy(desc(matricula.createdAt));
}

// Usada pela autorização de acesso da catraca: situação é sempre calculada
// a partir da matrícula mais recente do aluno (getSituacaoMatricula).
export async function getUltimaMatriculaDoAluno(alunoId: string) {
  const [row] = await getDb()
    .select({
      id: matricula.id,
      status: matricula.status,
      dataExpiracao: matricula.dataExpiracao,
    })
    .from(matricula)
    .where(eq(matricula.alunoId, alunoId))
    .orderBy(desc(matricula.createdAt))
    .limit(1);

  return row;
}

export async function getMatriculaStatus(id: string) {
  const [row] = await getDb()
    .select({
      status: matricula.status,
      assinaturaNome: matricula.assinaturaNome,
      assinaturaImagem: matricula.assinaturaImagem,
      assinadoEm: matricula.assinadoEm,
      dataExpiracao: matricula.dataExpiracao,
    })
    .from(matricula)
    .where(eq(matricula.id, id))
    .limit(1);

  return row;
}

// Regra de negócio: um aluno só pode ter uma matrícula por vez (de
// qualquer tipo). É preciso cancelá-la antes de criar outra.
export async function temMatriculaAtiva(alunoId: string) {
  const [row] = await getDb()
    .select({ id: matricula.id })
    .from(matricula)
    .where(
      and(
        eq(matricula.alunoId, alunoId),
        or(
          eq(matricula.status, "aguardando_assinatura"),
          and(
            eq(matricula.status, "assinada"),
            or(
              isNull(matricula.dataExpiracao),
              gte(matricula.dataExpiracao, new Date()),
            ),
          ),
        ),
      ),
    )
    .limit(1);

  return Boolean(row);
}

// Usadas pelo painel de pendências do dashboard.

export async function getMatriculasAguardandoAssinatura() {
  return getDb()
    .select({
      id: matricula.id,
      alunoNome: aluno.nome,
      planoNome: plano.nome,
      createdAt: matricula.createdAt,
    })
    .from(matricula)
    .innerJoin(aluno, eq(matricula.alunoId, aluno.id))
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .where(eq(matricula.status, "aguardando_assinatura"))
    .orderBy(desc(matricula.createdAt));
}

// Primeira parcela pendente mas ainda não vencida: já bloqueia o acesso na
// catraca (temPrimeiraParcelaPendente), mas não entra em
// getPagamentosAtrasados por não estar vencida ainda.
export async function getMatriculasPendentesPrimeiraParcela() {
  return getDb()
    .select({
      id: matricula.id,
      alunoNome: aluno.nome,
      planoNome: plano.nome,
      vencimento: pagamento.vencimento,
    })
    .from(matricula)
    .innerJoin(aluno, eq(matricula.alunoId, aluno.id))
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .innerJoin(
      pagamento,
      and(eq(pagamento.matriculaId, matricula.id), eq(pagamento.numeroParcela, 1)),
    )
    .where(
      and(
        eq(matricula.status, "assinada"),
        eq(pagamento.status, "pendente"),
        gte(pagamento.vencimento, new Date()),
      ),
    )
    .orderBy(asc(pagamento.vencimento));
}

// ===== Timeline / histórico =====

export type HistoricoEventoTipo =
  | (typeof MATRICULA_HISTORICO_TIPOS)[number]
  | "pagamento_confirmado";

export type HistoricoEvento = {
  id: string;
  tipo: HistoricoEventoTipo;
  descricao: string;
  createdAt: Date;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export async function getMatriculaHistorico(
  matriculaId: string,
): Promise<HistoricoEvento[]> {
  const eventos = await getDb()
    .select({
      id: matriculaHistorico.id,
      tipo: matriculaHistorico.tipo,
      descricao: matriculaHistorico.descricao,
      createdAt: matriculaHistorico.createdAt,
    })
    .from(matriculaHistorico)
    .where(eq(matriculaHistorico.matriculaId, matriculaId));

  const pagamentosConcluidos = await getDb()
    .select({
      id: pagamento.id,
      valor: pagamento.valor,
      formaPagamento: pagamento.formaPagamento,
      pagoEm: pagamento.pagoEm,
    })
    .from(pagamento)
    .where(
      and(eq(pagamento.matriculaId, matriculaId), eq(pagamento.status, "pago")),
    );

  const eventosPagamento: HistoricoEvento[] = pagamentosConcluidos.map(
    (item) => ({
      id: `pagamento-${item.id}`,
      tipo: "pagamento_confirmado",
      descricao: `Pagamento de ${currencyFormatter.format(Number(item.valor))} confirmado${
        item.formaPagamento
          ? ` via ${
              FORMAS_PAGAMENTO_OPCOES.find(
                ({ key }) => key === item.formaPagamento,
              )?.label
            }`
          : ""
      }.`,
      createdAt: item.pagoEm as Date,
    }),
  );

  return [...eventos, ...eventosPagamento].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

// ===== Mutações de ciclo de vida =====

export async function createMatricula(input: CreateMatriculaInput) {
  const data = createMatriculaSchema.parse(input);

  if (await temMatriculaAtiva(data.alunoId)) {
    throw new MatriculaAtivaError();
  }

  const [planoSelecionado] = await getDb()
    .select({ periodicidade: plano.periodicidade })
    .from(plano)
    .where(eq(plano.id, data.planoId))
    .limit(1);

  if (!planoSelecionado) {
    throw new Error("Plano não encontrado.");
  }

  // Personalização do contrato: se o admin definiu periodicidade/valor
  // específicos para esta matrícula, eles prevalecem sobre os do plano.
  const periodicidade =
    data.periodicidadePersonalizada ?? planoSelecionado.periodicidade;
  const renovacaoAutomatica =
    PERIODICIDADES_COM_RENOVACAO_AUTOMATICA.includes(periodicidade);
  const meses = mesesDaPeriodicidade(periodicidade) ?? 1;

  const [created] = await getDb()
    .insert(matricula)
    .values({
      alunoId: data.alunoId,
      planoId: data.planoId,
      tipo: "comum",
      periodicidade,
      valorPersonalizado:
        data.valorPersonalizado != null
          ? data.valorPersonalizado.toFixed(2)
          : null,
      parcelarMensal: meses > 1 ? data.parcelarMensal : true,
      renovacaoAutomatica,
      dataInicio: new Date(data.dataInicio),
      dataExpiracao: new Date(data.dataExpiracao),
      anamnese: data.anamnese.map((item) => ({
        pergunta: item.pergunta,
        resposta: Boolean(item.resposta),
        justificativa: item.justificativa,
      })),
    })
    .returning();

  await getDb().insert(matriculaHistorico).values({
    matriculaId: created.id,
    tipo: "criada",
    descricao: "Matrícula criada, aguardando assinatura do contrato.",
  });

  return created;
}

export async function assinarMatricula(
  token: string,
  input: AssinarMatriculaInput,
) {
  const data = assinarMatriculaSchema.parse(input);

  const [pendente] = await getDb()
    .select({
      id: matricula.id,
      periodicidade: matricula.periodicidade,
      parcelarMensal: matricula.parcelarMensal,
      dataInicio: matricula.dataInicio,
      // Valor cobrado nessa matrícula: snapshot do valor do plano vigente no
      // momento da assinatura, já que o plano pode ter seu preço alterado depois.
      valor: plano.valor,
      // Sobrescreve o valor do plano quando o contrato foi personalizado.
      valorPersonalizado: matricula.valorPersonalizado,
    })
    .from(matricula)
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .where(
      and(
        eq(matricula.token, token),
        eq(matricula.status, "aguardando_assinatura"),
      ),
    )
    .limit(1);

  if (!pendente) return undefined;

  const valorCobrado = pendente.valorPersonalizado ?? pendente.valor;

  const assinadoEm = new Date();

  const [updated] = await getDb()
    .update(matricula)
    .set({
      status: "assinada",
      assinaturaNome: data.nome,
      assinaturaImagem: data.assinaturaImagem,
      assinadoEm,
    })
    .where(eq(matricula.id, pendente.id))
    .returning();

  await getDb().insert(matriculaHistorico).values({
    matriculaId: pendente.id,
    tipo: "assinada",
    descricao: `Contrato assinado digitalmente por ${data.nome}.`,
  });

  const meses = mesesDaPeriodicidade(pendente.periodicidade) ?? 1;
  if (valorCobrado) {
    if (meses > 1 && pendente.parcelarMensal) {
      const parcelas = dividirEmParcelas(valorCobrado, meses);
      await getDb()
        .insert(pagamento)
        .values(
          parcelas.map((parcela, index) => ({
            matriculaId: pendente.id,
            valor: parcela,
            vencimento: addMeses(pendente.dataInicio, index),
            numeroParcela: index + 1,
          })),
        );
    } else {
      await getDb().insert(pagamento).values({
        matriculaId: pendente.id,
        valor: valorCobrado,
        vencimento: pendente.dataInicio,
        numeroParcela: 1,
      });
    }
  }

  return updated;
}

export async function cancelarMatricula(id: string) {
  const db = getDb();

  const [atual] = await db
    .select({ status: matricula.status })
    .from(matricula)
    .where(eq(matricula.id, id))
    .limit(1);

  if (!atual) return null;
  if (atual.status === "cancelada") {
    throw new MatriculaJaCanceladaError();
  }

  const [atualizada] = await db
    .update(matricula)
    .set({ status: "cancelada", canceladaEm: new Date() })
    .where(eq(matricula.id, id))
    .returning();

  await db.insert(matriculaHistorico).values({
    matriculaId: id,
    tipo: "cancelada",
    descricao: "Matrícula cancelada.",
  });

  return atualizada;
}

// Usado pela UI para decidir se mostra a opção de reabrir, sem duplicar
// a regra do prazo que é validada de novo (e com mais força) no server.
// Dentro do prazo, cancelar é reversível: reabrir devolve a matrícula
// exatamente ao status anterior ao cancelamento (assinada ou aguardando
// assinatura), sem alterar datas, assinatura ou pagamentos já gerados.
export async function reabrirMatricula(id: string) {
  const db = getDb();

  const [atual] = await db
    .select({
      alunoId: matricula.alunoId,
      status: matricula.status,
      assinadoEm: matricula.assinadoEm,
      canceladaEm: matricula.canceladaEm,
    })
    .from(matricula)
    .where(eq(matricula.id, id))
    .limit(1);

  if (!atual) return null;
  if (atual.status !== "cancelada" || !atual.canceladaEm) {
    throw new MatriculaNaoCanceladaError();
  }

  const limite = new Date(atual.canceladaEm);
  limite.setDate(limite.getDate() + PRAZO_REABERTURA_DIAS);
  if (Date.now() > limite.getTime()) {
    throw new PrazoReaberturaExpiradoError();
  }

  if (await temMatriculaAtiva(atual.alunoId)) {
    throw new MatriculaAtivaAoReabrirError();
  }

  const [atualizada] = await db
    .update(matricula)
    .set({
      status: atual.assinadoEm ? "assinada" : "aguardando_assinatura",
      canceladaEm: null,
    })
    .where(eq(matricula.id, id))
    .returning();

  await db.insert(matriculaHistorico).values({
    matriculaId: id,
    tipo: "reaberta",
    descricao: "Matrícula reaberta dentro do prazo de cancelamento.",
  });

  return atualizada;
}

// ===== Renovação / rematrícula =====

type MatriculaParaRenovacao = {
  id: string;
  status: string;
  periodicidade: PeriodicidadeKey;
  parcelarMensal: boolean;
  dataInicio: Date;
  dataExpiracao: Date | null;
  renovacaoAutomatica: boolean;
  // Preço ATUAL do plano (mesma lógica de assinarMatricula) — ao contrário
  // da continuação mensal dentro do mesmo ciclo, a renovação busca o preço
  // vigente, não um valor congelado. Já resolvido contra valorPersonalizado
  // em buscarParaRenovacao: se o contrato foi personalizado, é esse valor.
  valor: string;
};

async function buscarParaRenovacao(
  id: string,
): Promise<MatriculaParaRenovacao | undefined> {
  const [row] = await getDb()
    .select({
      id: matricula.id,
      status: matricula.status,
      periodicidade: matricula.periodicidade,
      parcelarMensal: matricula.parcelarMensal,
      dataInicio: matricula.dataInicio,
      dataExpiracao: matricula.dataExpiracao,
      renovacaoAutomatica: matricula.renovacaoAutomatica,
      valor: plano.valor,
      valorPersonalizado: matricula.valorPersonalizado,
    })
    .from(matricula)
    .innerJoin(plano, eq(matricula.planoId, plano.id))
    .where(eq(matricula.id, id))
    .limit(1);

  if (!row) return undefined;

  // Contrato personalizado continua cobrando o valor fixado nele, não o
  // preço vigente do plano, mesmo em renovações futuras.
  return { ...row, valor: row.valorPersonalizado ?? row.valor };
}

// Executa um único ciclo de renovação: estende dataExpiracao pelo número de
// meses da periodicidade e gera o(s) pagamento(s) correspondentes. O
// vencimento de qualquer parcela — inclusive a primeira do novo ciclo — é
// sempre calculado a partir de dataInicio + numeroParcela, nunca a partir de
// dataExpiracao: isso evita colidir com a parcela que o mecanismo de
// competências mensais (services/pagamentos.ts) já pode ter gerado com
// vencimento igual à antiga dataExpiracao.
async function executarUmCiclo(row: MatriculaParaRenovacao) {
  const db = getDb();
  if (!row.dataExpiracao) throw new MatriculaNaoElegivelParaRenovacaoError();

  const meses = mesesDaPeriodicidade(row.periodicidade) ?? 1;
  const novaDataExpiracao = addMeses(row.dataExpiracao, meses);

  const [ultima] = await db
    .select({ numeroParcela: pagamento.numeroParcela })
    .from(pagamento)
    .where(eq(pagamento.matriculaId, row.id))
    .orderBy(desc(pagamento.numeroParcela))
    .limit(1);
  const proximoNumeroBase = (ultima?.numeroParcela ?? 0) + 1;

  if (row.valor) {
    if (meses > 1 && row.parcelarMensal) {
      const parcelas = dividirEmParcelas(row.valor, meses);
      await db.insert(pagamento).values(
        parcelas.map((parcela, index) => ({
          matriculaId: row.id,
          valor: parcela,
          vencimento: addMeses(row.dataInicio, proximoNumeroBase - 1 + index),
          numeroParcela: proximoNumeroBase + index,
        })),
      );
    } else {
      await db.insert(pagamento).values({
        matriculaId: row.id,
        valor: row.valor,
        vencimento: addMeses(row.dataInicio, proximoNumeroBase - 1),
        numeroParcela: proximoNumeroBase,
      });
    }
  }

  await db
    .update(matricula)
    .set({ dataExpiracao: novaDataExpiracao })
    .where(eq(matricula.id, row.id));

  await db.insert(matriculaHistorico).values({
    matriculaId: row.id,
    tipo: "renovada",
    descricao: row.renovacaoAutomatica
      ? "Rematrícula automática gerada ao final do ciclo."
      : "Rematrícula confirmada manualmente pelo administrador.",
  });
}

// Catch-up: aplica quantos ciclos forem necessários até a vigência alcançar
// "agora" (útil se o sistema ficou um tempo sem disparar o lazy trigger).
async function aplicarCiclosAteAgora(id: string) {
  const agora = new Date();
  for (;;) {
    const row = await buscarParaRenovacao(id);
    if (!row || !row.dataExpiracao) return;
    if (row.dataExpiracao.getTime() >= agora.getTime()) return;
    await executarUmCiclo(row);
  }
}

// Predicado puro usado pela UI para decidir se mostra o botão "Confirmar
// rematrícula" — mesma ideia de podeReabrirMatricula.
export function precisaConfirmarRematricula(m: {
  status: string;
  periodicidade: string;
  dataExpiracao: Date | string | null;
  renovacaoAutomatica: boolean;
}) {
  if (m.periodicidade === "diaria") return false;
  if (m.renovacaoAutomatica) return false;
  return getSituacaoMatricula(m.status, m.dataExpiracao) === "expirada";
}

// Chamada pelo botão "Confirmar rematrícula" (modo manual).
export async function confirmarRematricula(id: string) {
  const row = await buscarParaRenovacao(id);
  if (!row) return null;

  if (row.status !== "assinada" || row.periodicidade === "diaria") {
    throw new MatriculaNaoElegivelParaRenovacaoError();
  }
  if (row.renovacaoAutomatica) {
    throw new RenovacaoJaAutomaticaError();
  }
  if (getSituacaoMatricula(row.status, row.dataExpiracao) !== "expirada") {
    throw new MatriculaAindaNaoVencidaError();
  }

  await aplicarCiclosAteAgora(id);
  return { id };
}

// Chamada pelo lazy trigger (modo automático) a partir de
// services/pagamentos.ts. Cobre mensal e anual; as demais periodicidades
// (diária e as novas bimestral/trimestral/quadrimestral/semestral) sempre
// passam pela confirmação manual do admin.
export async function renovarMatriculasAutomaticas(matriculaId?: string) {
  const db = getDb();
  const agora = new Date();

  const condicoes = [
    eq(matricula.status, "assinada"),
    eq(matricula.renovacaoAutomatica, true),
    inArray(matricula.periodicidade, PERIODICIDADES_COM_RENOVACAO_AUTOMATICA),
    lt(matricula.dataExpiracao, agora),
  ];
  if (matriculaId) condicoes.push(eq(matricula.id, matriculaId));

  const candidatas = await db
    .select({ id: matricula.id })
    .from(matricula)
    .where(and(...condicoes));

  for (const item of candidatas) {
    await aplicarCiclosAteAgora(item.id);
  }
}

// Toggle usado pelo switch da UI. Só existe para periodicidades elegíveis à
// renovação automática (mensal/anual) — as demais ficam sempre em modo
// manual (ver PERIODICIDADES_COM_RENOVACAO_AUTOMATICA).
export async function atualizarRenovacaoAutomatica(
  id: string,
  renovacaoAutomatica: boolean,
) {
  const db = getDb();
  const [atual] = await db
    .select({ periodicidade: matricula.periodicidade })
    .from(matricula)
    .where(eq(matricula.id, id))
    .limit(1);

  if (!atual) return null;
  if (!PERIODICIDADES_COM_RENOVACAO_AUTOMATICA.includes(atual.periodicidade)) {
    throw new PeriodicidadeNaoRenovavelError();
  }

  const [atualizada] = await db
    .update(matricula)
    .set({ renovacaoAutomatica })
    .where(eq(matricula.id, id))
    .returning();

  return atualizada;
}
