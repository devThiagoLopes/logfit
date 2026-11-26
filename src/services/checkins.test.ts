import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { matricula } from "@/lib/db/matricula-schema";
import { pagamento } from "@/lib/db/pagamento-schema";
import { checkin } from "@/lib/db/checkin-schema";
import {
  autorizarAcesso,
  getResumoCheckinHoje,
  registrarCheckin,
} from "@/services/checkins";
import { createAluno, deleteAluno } from "@/services/alunos";
import { createPlano, deletePlano } from "@/services/planos";
import { createDispositivo, deleteDispositivo } from "@/services/dispositivos";
import { assinarMatricula, createMatricula } from "@/services/matriculas";
import { concluirPagamento } from "@/services/pagamentos";
import type { CreateMatriculaInput } from "@/lib/validations/matricula";

function cpfAleatorio() {
  const n = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-00`;
}

describe("autorizarAcesso (integração com o banco de teste)", () => {
  const alunosCriados: string[] = [];
  const planosCriados: string[] = [];
  const matriculasCriadas: string[] = [];

  afterAll(async () => {
    if (matriculasCriadas.length) {
      await getDb()
        .delete(matricula)
        .where(inArray(matricula.id, matriculasCriadas));
    }
    await Promise.all(alunosCriados.map((id) => deleteAluno(id)));
    await Promise.all(planosCriados.map((id) => deletePlano(id)));
  });

  async function criarAlunoDeTeste(overrides: {
    situacao?: "ativo" | "inativo" | "trancado";
    debito?: number;
  } = {}) {
    const cpf = cpfAleatorio();
    const aluno = await createAluno({
      nome: "Aluno CI Teste Checkin",
      email: undefined,
      dataNascimento: undefined,
      endereco: undefined,
      numero: undefined,
      bairro: undefined,
      cidade: undefined,
      uf: undefined,
      cep: undefined,
      rg: undefined,
      observacoes: undefined,
      telefone: "(11) 99999-9999",
      cpf,
      situacao: overrides.situacao ?? "ativo",
      debito: overrides.debito ?? 0,
    });
    alunosCriados.push(aluno.id);
    return aluno;
  }

  async function criarMatriculaAssinada(alunoId: string, pagarPrimeiraParcela: boolean) {
    const plano = await createPlano({
      nome: "Plano CI Teste",
      periodicidade: "mensal",
      valor: 100,
    });
    planosCriados.push(plano.id);

    const input: CreateMatriculaInput = {
      alunoId,
      planoId: plano.id,
      dataInicio: new Date().toISOString(),
      dataExpiracao: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      parcelarMensal: true,
      periodicidadePersonalizada: null,
      valorPersonalizado: null,
      anamnese: [],
    };
    const criada = await createMatricula(input);
    matriculasCriadas.push(criada.id);

    await assinarMatricula(criada.token, {
      nome: "Fulano",
      assinaturaImagem: "data:image/png;base64,abc",
      concordo: true,
    });

    if (pagarPrimeiraParcela) {
      const [parcela] = await getDb()
        .select({ id: pagamento.id })
        .from(pagamento)
        .where(eq(pagamento.matriculaId, criada.id));
      await concluirPagamento(parcela.id, { formaPagamento: "pix" });
    }

    return criada;
  }

  it("bloqueia quando o aluno não é encontrado", async () => {
    const resultado = await autorizarAcesso({ cpf: cpfAleatorio() });
    expect(resultado).toEqual({
      liberado: false,
      motivo: "Aluno não encontrado.",
    });
  });

  it("bloqueia aluno inativo", async () => {
    const aluno = await criarAlunoDeTeste({ situacao: "inativo" });
    const resultado = await autorizarAcesso({ cpf: aluno.cpf });
    expect(resultado).toEqual({ liberado: false, motivo: "Aluno inativo." });
  });

  it("bloqueia aluno trancado", async () => {
    const aluno = await criarAlunoDeTeste({ situacao: "trancado" });
    const resultado = await autorizarAcesso({ cpf: aluno.cpf });
    expect(resultado).toEqual({
      liberado: false,
      motivo: "Matrícula trancada.",
    });
  });

  it("bloqueia quando não há matrícula ativa", async () => {
    const aluno = await criarAlunoDeTeste();
    const resultado = await autorizarAcesso({ cpf: aluno.cpf });
    expect(resultado).toEqual({
      liberado: false,
      motivo: "Sem matrícula ativa.",
    });
  });

  it("bloqueia quando a 1ª parcela ainda está pendente", async () => {
    const aluno = await criarAlunoDeTeste();
    await criarMatriculaAssinada(aluno.id, false);

    const resultado = await autorizarAcesso({ cpf: aluno.cpf });
    expect(resultado).toEqual({
      liberado: false,
      motivo: "Matrícula pendente de pagamento.",
    });
  });

  it("bloqueia quando o aluno está em débito", async () => {
    const aluno = await criarAlunoDeTeste({ debito: 50 });
    await criarMatriculaAssinada(aluno.id, true);

    const resultado = await autorizarAcesso({ cpf: aluno.cpf });
    expect(resultado).toEqual({
      liberado: false,
      motivo: "Pagamento em atraso.",
    });
  });

  it("libera o acesso quando tudo está em dia", async () => {
    const aluno = await criarAlunoDeTeste();
    await criarMatriculaAssinada(aluno.id, true);

    const resultado = await autorizarAcesso({ cpf: aluno.cpf });
    expect(resultado).toEqual({
      liberado: true,
      aluno: { nome: aluno.nome, fotoUrl: null },
    });
  });

  it("também autoriza buscando pelo número de matrícula", async () => {
    const aluno = await criarAlunoDeTeste();
    await criarMatriculaAssinada(aluno.id, true);

    const resultado = await autorizarAcesso({ matricula: aluno.matricula });
    expect(resultado.liberado).toBe(true);
  });
});

describe("getResumoCheckinHoje (integração com o banco de teste)", () => {
  const alunosCriados: string[] = [];
  const checkinsCriados: string[] = [];
  const dispositivosCriados: string[] = [];

  afterAll(async () => {
    if (checkinsCriados.length) {
      await getDb().delete(checkin).where(inArray(checkin.id, checkinsCriados));
    }
    await Promise.all(dispositivosCriados.map((id) => deleteDispositivo(id)));
    await Promise.all(alunosCriados.map((id) => deleteAluno(id)));
  });

  it("conta passagens/negados e deduplica presença pelo último sentido por pessoa", async () => {
    const aluno = await createAluno({
      nome: "Aluno CI Teste Resumo",
      email: undefined,
      dataNascimento: undefined,
      endereco: undefined,
      numero: undefined,
      bairro: undefined,
      cidade: undefined,
      uf: undefined,
      cep: undefined,
      rg: undefined,
      observacoes: undefined,
      telefone: "(11) 99999-9999",
      cpf: cpfAleatorio(),
      situacao: "ativo",
      debito: 0,
    });
    alunosCriados.push(aluno.id);

    const dispositivo = await createDispositivo({
      nome: "Catraca CI Teste Resumo",
      local: undefined,
      tipo: "catraca",
      lotacaoMaxima: 10,
    });
    dispositivosCriados.push(dispositivo.id);

    const antes = await getResumoCheckinHoje();

    const entrada = await registrarCheckin(dispositivo.id, {
      cpf: aluno.cpf,
      liberado: true,
      sentido: "entrada",
    });
    checkinsCriados.push(entrada.id);

    const saida = await registrarCheckin(dispositivo.id, {
      cpf: aluno.cpf,
      liberado: true,
      sentido: "saida",
    });
    checkinsCriados.push(saida.id);

    const negado = await registrarCheckin(dispositivo.id, {
      cpf: "000.000.000-00",
      liberado: false,
      motivo: "Aluno não encontrado.",
    });
    checkinsCriados.push(negado.id);

    const depois = await getResumoCheckinHoje();

    expect(depois.passagensHoje).toBe(antes.passagensHoje + 2);
    expect(depois.negadosHoje).toBe(antes.negadosHoje + 1);
    // O aluno criado aqui teve entrada e depois saída: não deve contar como
    // presente a mais em relação ao estado anterior ao teste.
    expect(depois.pessoasNaAcademia).toBe(antes.pessoasNaAcademia);
  });
});
