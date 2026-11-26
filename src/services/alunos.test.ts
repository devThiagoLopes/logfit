import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { matricula } from "@/lib/db/matricula-schema";
import {
  createAluno,
  deleteAluno,
  getAlunoByMatriculaOuCpf,
  getAlunosDisponiveisParaMatricula,
} from "@/services/alunos";
import { createPlano, deletePlano } from "@/services/planos";
import { cancelarMatricula, createMatricula } from "@/services/matriculas";
import type { CreateMatriculaInput } from "@/lib/validations/matricula";

function cpfAleatorio() {
  const n = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-00`;
}

describe("services/alunos (integração com o banco de teste)", () => {
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

  async function criarAlunoDeTeste(cpf: string) {
    const aluno = await createAluno({
      nome: "Aluno CI Teste Busca",
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
      situacao: "ativo",
      debito: 0,
    });
    alunosCriados.push(aluno.id);
    return aluno;
  }

  describe("getAlunoByMatriculaOuCpf", () => {
    it("encontra pelo número de matrícula", async () => {
      const cpf = cpfAleatorio();
      const aluno = await criarAlunoDeTeste(cpf);

      const encontrado = await getAlunoByMatriculaOuCpf({
        matricula: aluno.matricula,
      });

      expect(encontrado?.id).toBe(aluno.id);
    });

    it("encontra pelo CPF, ignorando a máscara enviada", async () => {
      const cpfBase = cpfAleatorio();
      const aluno = await criarAlunoDeTeste(cpfBase);

      const encontrado = await getAlunoByMatriculaOuCpf({
        cpf: cpfBase.replace(/\D/g, ""),
      });

      expect(encontrado?.id).toBe(aluno.id);
    });

    it("retorna undefined quando não encontra ninguém", async () => {
      const encontrado = await getAlunoByMatriculaOuCpf({ cpf: "00000000000" });
      expect(encontrado).toBeUndefined();
    });
  });

  describe("getAlunosDisponiveisParaMatricula", () => {
    it("exclui aluno com matrícula ativa ou aguardando assinatura", async () => {
      const semMatricula = await criarAlunoDeTeste(cpfAleatorio());
      const comMatricula = await criarAlunoDeTeste(cpfAleatorio());

      const plano = await createPlano({
        nome: "Plano CI Teste",
        periodicidade: "mensal",
        valor: 100,
      });
      planosCriados.push(plano.id);

      const input: CreateMatriculaInput = {
        alunoId: comMatricula.id,
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

      const disponiveis = await getAlunosDisponiveisParaMatricula();
      const ids = disponiveis.map((a) => a.id);

      expect(ids).toContain(semMatricula.id);
      expect(ids).not.toContain(comMatricula.id);
    });

    it("volta a incluir o aluno depois que a matrícula é cancelada", async () => {
      const aluno = await criarAlunoDeTeste(cpfAleatorio());
      const plano = await createPlano({
        nome: "Plano CI Teste",
        periodicidade: "mensal",
        valor: 100,
      });
      planosCriados.push(plano.id);

      const input: CreateMatriculaInput = {
        alunoId: aluno.id,
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

      await cancelarMatricula(criada.id);

      const disponiveis = await getAlunosDisponiveisParaMatricula();
      expect(disponiveis.map((a) => a.id)).toContain(aluno.id);
    });
  });
});
