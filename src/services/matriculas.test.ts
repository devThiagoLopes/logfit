import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { matricula } from "@/lib/db/matricula-schema";
import { pagamento } from "@/lib/db/pagamento-schema";
import { createAluno, deleteAluno } from "@/services/alunos";
import { createPlano, deletePlano } from "@/services/planos";
import {
  addMeses,
  assinarMatricula,
  cancelarMatricula,
  confirmarRematricula,
  createMatricula,
  getSituacaoExibicao,
  MatriculaAindaNaoVencidaError,
  MatriculaAtivaError,
  MatriculaAtivaAoReabrirError,
  MatriculaJaCanceladaError,
  MatriculaNaoCanceladaError,
  PrazoReaberturaExpiradoError,
  reabrirMatricula,
  renovarMatriculasAutomaticas,
  RenovacaoJaAutomaticaError,
  temMatriculaAtiva,
} from "@/services/matriculas";
import type { CreateMatriculaInput } from "@/lib/validations/matricula";

function cpfAleatorio() {
  const n = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-00`;
}

describe("services/matriculas (integração com o banco de teste)", () => {
  const alunosCriados: string[] = [];
  const planosCriados: string[] = [];
  const matriculasCriadas: string[] = [];

  afterAll(async () => {
    // Apaga as matrículas primeiro: pagamento/matricula_historico cascateiam
    // a partir delas, mas matricula -> aluno/plano não tem cascade.
    if (matriculasCriadas.length) {
      await getDb()
        .delete(matricula)
        .where(inArray(matricula.id, matriculasCriadas));
    }
    await Promise.all(alunosCriados.map((id) => deleteAluno(id)));
    await Promise.all(planosCriados.map((id) => deletePlano(id)));
  });

  async function criarMatriculaDeTeste(input: CreateMatriculaInput) {
    const criada = await createMatricula(input);
    matriculasCriadas.push(criada.id);
    return criada;
  }

  async function criarAlunoDeTeste() {
    const aluno = await createAluno({
      nome: "Aluno CI Teste Matricula",
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
    return aluno;
  }

  async function criarPlanoDeTeste(
    periodicidade: "mensal" | "trimestral" | "anual",
    valor: number,
  ) {
    const plano = await createPlano({ nome: "Plano CI Teste", periodicidade, valor });
    planosCriados.push(plano.id);
    return plano;
  }

  function inputBase(
    alunoId: string,
    planoId: string,
    overrides: Partial<CreateMatriculaInput> = {},
  ): CreateMatriculaInput {
    return {
      alunoId,
      planoId,
      dataInicio: new Date().toISOString(),
      dataExpiracao: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      parcelarMensal: true,
      periodicidadePersonalizada: null,
      valorPersonalizado: null,
      anamnese: [],
      ...overrides,
    };
  }

  describe("addMeses", () => {
    it("soma meses sem alterar o objeto original", () => {
      const data = new Date("2026-01-15T00:00:00.000Z");
      const resultado = addMeses(data, 2);
      expect(resultado.toISOString().slice(0, 10)).toBe("2026-03-15");
      expect(data.toISOString().slice(0, 10)).toBe("2026-01-15");
    });
  });

  describe("getSituacaoExibicao", () => {
    it("retorna 'pendente' quando ativa mas a 1ª parcela ainda não foi paga", () => {
      expect(getSituacaoExibicao("ativa", true)).toBe("pendente");
    });

    it("retorna a própria situação quando não há 1ª parcela pendente", () => {
      expect(getSituacaoExibicao("ativa", false)).toBe("ativa");
      expect(getSituacaoExibicao("expirada", true)).toBe("expirada");
    });
  });

  describe("createMatricula / temMatriculaAtiva", () => {
    it("cria a matrícula e bloqueia uma segunda para o mesmo aluno", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("mensal", 100);

      expect(await temMatriculaAtiva(aluno.id)).toBe(false);

      const criada = await criarMatriculaDeTeste(inputBase(aluno.id, plano.id));
      expect(criada.status).toBe("aguardando_assinatura");
      expect(await temMatriculaAtiva(aluno.id)).toBe(true);

      await expect(
        createMatricula(inputBase(aluno.id, plano.id)),
      ).rejects.toThrow(MatriculaAtivaError);
    });
  });

  describe("assinarMatricula", () => {
    it("gera parcela única quando a periodicidade não é parcelável", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("mensal", 150);
      const criada = await criarMatriculaDeTeste(inputBase(aluno.id, plano.id));

      const assinada = await assinarMatricula(criada.token, {
        nome: "Fulano de Tal",
        assinaturaImagem: "data:image/png;base64,abc",
        concordo: true,
      });

      expect(assinada?.status).toBe("assinada");

      const parcelas = await getDb()
        .select({ valor: pagamento.valor, numeroParcela: pagamento.numeroParcela })
        .from(pagamento)
        .where(eq(pagamento.matriculaId, criada.id));

      expect(parcelas).toHaveLength(1);
      expect(parcelas[0]?.valor).toBe("150.00");
      expect(parcelas[0]?.numeroParcela).toBe(1);
    });

    it("divide em parcelas mensais, absorvendo o resto nas primeiras", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("trimestral", 100);
      const criada = await criarMatriculaDeTeste(
        inputBase(aluno.id, plano.id, { parcelarMensal: true }),
      );

      await assinarMatricula(criada.token, {
        nome: "Fulano de Tal",
        assinaturaImagem: "data:image/png;base64,abc",
        concordo: true,
      });

      const parcelas = await getDb()
        .select({ valor: pagamento.valor, numeroParcela: pagamento.numeroParcela })
        .from(pagamento)
        .where(eq(pagamento.matriculaId, criada.id))
        .orderBy(pagamento.numeroParcela);

      expect(parcelas).toHaveLength(3);
      expect(parcelas.map((p) => p.valor)).toEqual(["33.34", "33.33", "33.33"]);
      const soma = parcelas.reduce((acc, p) => acc + Number(p.valor), 0);
      expect(soma).toBeCloseTo(100, 2);
    });

    it("usa o valorPersonalizado no lugar do valor do plano", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("mensal", 200);
      const criada = await criarMatriculaDeTeste(
        inputBase(aluno.id, plano.id, { valorPersonalizado: 50 }),
      );

      await assinarMatricula(criada.token, {
        nome: "Fulano de Tal",
        assinaturaImagem: "data:image/png;base64,abc",
        concordo: true,
      });

      const [parcela] = await getDb()
        .select({ valor: pagamento.valor })
        .from(pagamento)
        .where(eq(pagamento.matriculaId, criada.id));

      expect(parcela?.valor).toBe("50.00");
    });
  });

  describe("cancelarMatricula / reabrirMatricula", () => {
    it("cancela, reabre dentro do prazo e bloqueia reabrir duas vezes", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("mensal", 100);
      const criada = await criarMatriculaDeTeste(inputBase(aluno.id, plano.id));

      await cancelarMatricula(criada.id);

      await expect(cancelarMatricula(criada.id)).rejects.toThrow(
        MatriculaJaCanceladaError,
      );

      const reaberta = await reabrirMatricula(criada.id);
      expect(reaberta?.status).toBe("aguardando_assinatura");

      await expect(reabrirMatricula(criada.id)).rejects.toThrow(
        MatriculaNaoCanceladaError,
      );
    });

    it("bloqueia reabrir fora do prazo de 10 dias", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("mensal", 100);
      const criada = await criarMatriculaDeTeste(inputBase(aluno.id, plano.id));
      await cancelarMatricula(criada.id);

      await getDb()
        .update(matricula)
        .set({ canceladaEm: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) })
        .where(eq(matricula.id, criada.id));

      await expect(reabrirMatricula(criada.id)).rejects.toThrow(
        PrazoReaberturaExpiradoError,
      );
    });

    it("bloqueia reabrir quando o aluno já tem outra matrícula ativa", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("mensal", 100);
      const primeira = await criarMatriculaDeTeste(inputBase(aluno.id, plano.id));
      await cancelarMatricula(primeira.id);

      await criarMatriculaDeTeste(inputBase(aluno.id, plano.id));

      await expect(reabrirMatricula(primeira.id)).rejects.toThrow(
        MatriculaAtivaAoReabrirError,
      );
    });
  });

  describe("renovação automática / confirmação manual", () => {
    it("renova automaticamente uma matrícula mensal vencida com renovacaoAutomatica", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("mensal", 100);
      const criada = await criarMatriculaDeTeste(
        inputBase(aluno.id, plano.id, {
          dataInicio: new Date(
            Date.now() - 35 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dataExpiracao: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      );
      await assinarMatricula(criada.token, {
        nome: "Fulano",
        assinaturaImagem: "data:image/png;base64,abc",
        concordo: true,
      });

      const antes = await getDb()
        .select({ dataExpiracao: matricula.dataExpiracao })
        .from(matricula)
        .where(eq(matricula.id, criada.id));

      await renovarMatriculasAutomaticas(criada.id);

      const [depois] = await getDb()
        .select({ dataExpiracao: matricula.dataExpiracao })
        .from(matricula)
        .where(eq(matricula.id, criada.id));

      expect(depois.dataExpiracao!.getTime()).toBeGreaterThan(
        antes[0].dataExpiracao!.getTime(),
      );
    });

    it("confirmarRematricula exige periodicidade não-diária, não-automática e vencida", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("trimestral", 100);
      const criada = await criarMatriculaDeTeste(
        inputBase(aluno.id, plano.id, {
          dataExpiracao: new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      );
      await assinarMatricula(criada.token, {
        nome: "Fulano",
        assinaturaImagem: "data:image/png;base64,abc",
        concordo: true,
      });

      // Ainda não venceu: deve lançar MatriculaAindaNaoVencidaError
      await expect(confirmarRematricula(criada.id)).rejects.toThrow(
        MatriculaAindaNaoVencidaError,
      );

      await getDb()
        .update(matricula)
        .set({
          dataExpiracao: new Date(Date.now() - 24 * 60 * 60 * 1000),
        })
        .where(eq(matricula.id, criada.id));

      const resultado = await confirmarRematricula(criada.id);
      expect(resultado).toEqual({ id: criada.id });
    });

    it("bloqueia confirmarRematricula quando a periodicidade já é automática", async () => {
      const aluno = await criarAlunoDeTeste();
      const plano = await criarPlanoDeTeste("mensal", 100);
      const criada = await criarMatriculaDeTeste(
        inputBase(aluno.id, plano.id, {
          dataInicio: new Date(
            Date.now() - 35 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dataExpiracao: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      );
      await assinarMatricula(criada.token, {
        nome: "Fulano",
        assinaturaImagem: "data:image/png;base64,abc",
        concordo: true,
      });

      await expect(confirmarRematricula(criada.id)).rejects.toThrow(
        RenovacaoJaAutomaticaError,
      );
    });
  });
});
