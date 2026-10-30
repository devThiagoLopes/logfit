import { and, desc, eq, gte, lte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { aluno } from "@/lib/db/aluno-schema";
import { checkin } from "@/lib/db/checkin-schema";
import { dispositivo } from "@/lib/db/dispositivo-schema";
import { getAlunoByMatriculaOuCpf } from "@/services/alunos";
import { getUltimaMatriculaDoAluno, getSituacaoMatricula } from "@/services/matriculas";
import {
  temPagamentoAtrasado,
  temPrimeiraParcelaPendente,
} from "@/services/pagamentos";
import {
  autorizarAcessoSchema,
  registrarCheckinSchema,
  type AutorizarAcessoInput,
  type RegistrarCheckinInput,
} from "@/lib/validations/checkin";

export type AutorizarAcessoResultado =
  | { liberado: true; aluno: { nome: string; fotoUrl: string | null } }
  | { liberado: false; motivo: string };

// Regra de negócio de quem pode entrar agora. Reaproveita a situação da
// matrícula (getSituacaoMatricula) e o débito/pagamentos do aluno, sem
// duplicar nenhuma lógica já existente em matriculas/pagamentos.
export async function autorizarAcesso(
  input: AutorizarAcessoInput,
): Promise<AutorizarAcessoResultado> {
  const data = autorizarAcessoSchema.parse(input);

  const alunoEncontrado = await getAlunoByMatriculaOuCpf(data);
  if (!alunoEncontrado) {
    return { liberado: false, motivo: "Aluno não encontrado." };
  }
  if (alunoEncontrado.situacao === "inativo") {
    return { liberado: false, motivo: "Aluno inativo." };
  }
  if (alunoEncontrado.situacao === "trancado") {
    return { liberado: false, motivo: "Matrícula trancada." };
  }

  const ultimaMatricula = await getUltimaMatriculaDoAluno(alunoEncontrado.id);
  const situacao = ultimaMatricula
    ? getSituacaoMatricula(ultimaMatricula.status, ultimaMatricula.dataExpiracao)
    : null;
  if (situacao !== "ativa") {
    return { liberado: false, motivo: "Sem matrícula ativa." };
  }

  // Contrato assinado não é suficiente: só libera depois que a primeira
  // parcela for confirmada (paga). Até lá, a matrícula está pendente.
  if (await temPrimeiraParcelaPendente(ultimaMatricula.id)) {
    return { liberado: false, motivo: "Matrícula pendente de pagamento." };
  }

  const emDebito =
    Number(alunoEncontrado.debito) > 0 ||
    (await temPagamentoAtrasado(alunoEncontrado.id));
  if (emDebito) {
    return { liberado: false, motivo: "Pagamento em atraso." };
  }

  return {
    liberado: true,
    aluno: { nome: alunoEncontrado.nome, fotoUrl: alunoEncontrado.fotoUrl },
  };
}

// Ingestão do evento reportado pelo dispositivo: não recalcula a regra, só
// persiste o liberado/motivo que o próprio dispositivo (ou um override
// manual na recepção) informou.
export async function registrarCheckin(
  dispositivoId: string,
  input: RegistrarCheckinInput,
) {
  const data = registrarCheckinSchema.parse(input);

  const alunoEncontrado = await getAlunoByMatriculaOuCpf(data);

  const [created] = await getDb()
    .insert(checkin)
    .values({
      dispositivoId,
      alunoId: alunoEncontrado?.id ?? null,
      identificadorTipo: data.matricula ? "matricula" : "cpf",
      identificadorValor: String(data.matricula ?? data.cpf),
      liberado: data.liberado,
      motivo: data.motivo ?? null,
      sentido: data.sentido ?? null,
      ocorridoEm: data.ocorridoEm ?? new Date(),
    })
    .returning();

  return created;
}

export async function getCheckins(filtro?: {
  alunoId?: string;
  dispositivoId?: string;
  inicio?: Date;
  fim?: Date;
}) {
  const condicoes = [
    filtro?.alunoId ? eq(checkin.alunoId, filtro.alunoId) : undefined,
    filtro?.dispositivoId
      ? eq(checkin.dispositivoId, filtro.dispositivoId)
      : undefined,
    filtro?.inicio ? gte(checkin.ocorridoEm, filtro.inicio) : undefined,
    filtro?.fim ? lte(checkin.ocorridoEm, filtro.fim) : undefined,
  ].filter((condicao) => condicao !== undefined);

  return getDb()
    .select({
      id: checkin.id,
      liberado: checkin.liberado,
      motivo: checkin.motivo,
      sentido: checkin.sentido,
      identificadorTipo: checkin.identificadorTipo,
      identificadorValor: checkin.identificadorValor,
      ocorridoEm: checkin.ocorridoEm,
      alunoNome: aluno.nome,
      dispositivoNome: dispositivo.nome,
    })
    .from(checkin)
    .leftJoin(aluno, eq(checkin.alunoId, aluno.id))
    .innerJoin(dispositivo, eq(checkin.dispositivoId, dispositivo.id))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(checkin.ocorridoEm));
}

export async function getCheckinsRecentes(limite = 10) {
  return getDb()
    .select({
      id: checkin.id,
      liberado: checkin.liberado,
      motivo: checkin.motivo,
      sentido: checkin.sentido,
      identificadorValor: checkin.identificadorValor,
      ocorridoEm: checkin.ocorridoEm,
      alunoNome: aluno.nome,
      dispositivoNome: dispositivo.nome,
    })
    .from(checkin)
    .leftJoin(aluno, eq(checkin.alunoId, aluno.id))
    .innerJoin(dispositivo, eq(checkin.dispositivoId, dispositivo.id))
    .orderBy(desc(checkin.ocorridoEm))
    .limit(limite);
}
