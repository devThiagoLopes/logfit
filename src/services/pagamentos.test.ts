import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { matricula } from "@/lib/db/matricula-schema";
import { pagamento } from "@/lib/db/pagamento-schema";
import { createAluno, deleteAluno } from "@/services/alunos";
import { createPlano, deletePlano } from "@/services/planos";
import { assinarMatricula, createMatricula } from "@/services/matriculas";
import type { CreateMatriculaInput } from "@/lib/validations/matricula";
import {
  concluirPagamento,
  ParcelaAnteriorPendenteError,
  temPagamentoAtrasado,
  temPrimeiraParcelaPendente,
} from "@/services/pagamentos";

function cpfAleatorio() {
  const n = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-00`;
}

describe("services/pagamentos (integração com o banco de teste)", () => {
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

  async function criarAlunoDeTeste() {
    const aluno = await createAluno({
      nome: "Aluno CI Teste Pagamentos",
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

  // Cria uma matrícula trimestral assinada (3 parcelas mensais geradas de uma vez).
  async function criarMatriculaComParcelas(alunoId: string) {
    const plano = await createPlano({
      nome: "Plano CI Teste",
      periodicidade: "trimestral",
      valor: 300,
    });
    planosCriados.push(plano.id);

    const input: CreateMatriculaInput = {
      alunoId,
      planoId: plano.id,
      dataInicio: new Date().toISOString(),
      dataExpiracao: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000,
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

    const parcelas = await getDb()
      .select({ id: pagamento.id, numeroParcela: pagamento.numeroParcela })
      .from(pagamento)
      .where(eq(pagamento.matriculaId, criada.id))
      .orderBy(pagamento.numeroParcela);

    return { matriculaId: criada.id, parcelas };
  }

  describe("concluirPagamento", () => {
    it("marca a parcela como paga quando não há parcela anterior pendente", async () => {
      const aluno = await criarAlunoDeTeste();
      const { parcelas } = await criarMatriculaComParcelas(aluno.id);

      const atualizado = await concluirPagamento(parcelas[0]!.id, {
        formaPagamento: "pix",
      });

      expect(atualizado?.status).toBe("pago");
      expect(atualizado?.formaPagamento).toBe("pix");
    });

    it("lança ParcelaAnteriorPendenteError ao tentar pagar fora de ordem", async () => {
      const aluno = await criarAlunoDeTeste();
      const { parcelas } = await criarMatriculaComParcelas(aluno.id);

      await expect(
        concluirPagamento(parcelas[1]!.id, { formaPagamento: "pix" }),
      ).rejects.toThrow(ParcelaAnteriorPendenteError);
    });

    it("retorna undefined ao tentar concluir uma parcela já paga", async () => {
      const aluno = await criarAlunoDeTeste();
      const { parcelas } = await criarMatriculaComParcelas(aluno.id);

      await concluirPagamento(parcelas[0]!.id, { formaPagamento: "pix" });
      const resultado = await concluirPagamento(parcelas[0]!.id, {
        formaPagamento: "pix",
      });

      expect(resultado).toBeUndefined();
    });
  });

  describe("temPrimeiraParcelaPendente / temPagamentoAtrasado", () => {
    it("temPrimeiraParcelaPendente é true antes de pagar e false depois", async () => {
      const aluno = await criarAlunoDeTeste();
      const { matriculaId, parcelas } = await criarMatriculaComParcelas(
        aluno.id,
      );

      expect(await temPrimeiraParcelaPendente(matriculaId)).toBe(true);

      await concluirPagamento(parcelas[0]!.id, { formaPagamento: "pix" });

      expect(await temPrimeiraParcelaPendente(matriculaId)).toBe(false);
    });

    it("temPagamentoAtrasado é true quando há parcela pendente vencida", async () => {
      const aluno = await criarAlunoDeTeste();
      const { parcelas } = await criarMatriculaComParcelas(aluno.id);

      expect(await temPagamentoAtrasado(aluno.id)).toBe(false);

      await getDb()
        .update(pagamento)
        .set({ vencimento: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .where(eq(pagamento.id, parcelas[0]!.id));

      expect(await temPagamentoAtrasado(aluno.id)).toBe(true);
    });
  });
});
