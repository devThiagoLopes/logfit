import { getAlunosDisponiveisParaMatricula } from "@/services/alunos";
import {
  getCheckinsRecentes,
  getMovimentoPorDiaSemana,
  getMovimentoPorHora,
  getResumoCheckinHoje,
} from "@/services/checkins";
import { getDispositivos } from "@/services/dispositivos";
import {
  getMatriculasAguardandoAssinatura,
  getMatriculasPendentesPrimeiraParcela,
} from "@/services/matriculas";
import { getPagamentosAtrasados } from "@/services/pagamentos";

export type PendenciaTipo =
  | "pagamento_atrasado"
  | "primeira_parcela_pendente"
  | "matricula_aguardando_assinatura"
  | "aluno_sem_matricula";

export type Pendencia = {
  id: string;
  tipo: PendenciaTipo;
  titulo: string;
  descricao: string;
  href: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export async function getPendencias(): Promise<Pendencia[]> {
  const [pagamentosAtrasados, aguardandoAssinatura, primeiraParcelaPendente, alunosDisponiveis] =
    await Promise.all([
      getPagamentosAtrasados(),
      getMatriculasAguardandoAssinatura(),
      getMatriculasPendentesPrimeiraParcela(),
      getAlunosDisponiveisParaMatricula(),
    ]);

  const agora = Date.now();
  const umDiaMs = 24 * 60 * 60 * 1000;

  const pendencias: Pendencia[] = [
    ...pagamentosAtrasados.map((item): Pendencia => {
      const dias = Math.max(
        1,
        Math.floor((agora - new Date(item.vencimento).getTime()) / umDiaMs),
      );
      return {
        id: `pagamento-${item.id}`,
        tipo: "pagamento_atrasado",
        titulo: item.alunoNome,
        descricao: `Pagamento atrasado há ${dias} dia${dias > 1 ? "s" : ""} · ${currencyFormatter.format(Number(item.valor))}`,
        href: "/pagamentos",
      };
    }),
    ...primeiraParcelaPendente.map(
      (item): Pendencia => ({
        id: `parcela1-${item.id}`,
        tipo: "primeira_parcela_pendente",
        titulo: item.alunoNome,
        descricao: `Primeira parcela do plano ${item.planoNome} ainda não confirmada`,
        href: "/pagamentos",
      }),
    ),
    ...aguardandoAssinatura.map(
      (item): Pendencia => ({
        id: `assinatura-${item.id}`,
        tipo: "matricula_aguardando_assinatura",
        titulo: item.alunoNome,
        descricao: `Contrato do plano ${item.planoNome} aguardando assinatura`,
        href: "/matriculas",
      }),
    ),
    ...alunosDisponiveis
      .filter((item) => item.situacao === "ativo")
      .map(
        (item): Pendencia => ({
          id: `sem-matricula-${item.id}`,
          tipo: "aluno_sem_matricula",
          titulo: item.nome,
          descricao: "Aluno ativo sem matrícula vigente",
          href: "/alunos",
        }),
      ),
  ];

  return pendencias;
}

export async function getDashboardResumo(diasMovimentoPorDiaSemana = 30) {
  const [resumoCheckin, movimentoPorHora, movimentoPorDiaSemana, dispositivos, checkinsRecentes, pendencias] =
    await Promise.all([
      getResumoCheckinHoje(),
      getMovimentoPorHora(),
      getMovimentoPorDiaSemana(diasMovimentoPorDiaSemana),
      getDispositivos(),
      getCheckinsRecentes(),
      getPendencias(),
    ]);

  // Lotação é um atributo só das catracas ativas; sensores de vibração não
  // têm capacidade cadastrada (ver dispositivo-schema.ts).
  const lotacaoMaxima = dispositivos
    .filter((item) => item.tipo === "catraca" && item.ativo)
    .reduce((total, item) => total + (item.lotacaoMaxima ?? 0), 0);

  const ocupacao = {
    pessoasNaAcademia: resumoCheckin.pessoasNaAcademia,
    lotacaoMaxima,
    percentual:
      lotacaoMaxima > 0
        ? Math.round((resumoCheckin.pessoasNaAcademia / lotacaoMaxima) * 100)
        : null,
  };

  return {
    resumoCheckin,
    movimentoPorHora,
    movimentoPorDiaSemana,
    ocupacao,
    checkinsRecentes,
    pendencias,
  };
}
