import { afterAll, describe, expect, it } from "vitest";

import { createAluno, deleteAluno } from "@/services/alunos";
import { createDispositivo, deleteDispositivo } from "@/services/dispositivos";
import { getDashboardResumo, getPendencias } from "@/services/dashboard";

function cpfAleatorio() {
  const n = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-00`;
}

describe("getPendencias (integração com o banco de teste)", () => {
  const alunosCriados: string[] = [];

  afterAll(async () => {
    await Promise.all(alunosCriados.map((id) => deleteAluno(id)));
  });

  it("lista aluno ativo sem matrícula como pendência", async () => {
    const aluno = await createAluno({
      nome: "Aluno CI Teste Dashboard",
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

    const pendencias = await getPendencias();
    const ids = pendencias.map((p) => p.id);

    expect(ids).toContain(`sem-matricula-${aluno.id}`);
    expect(
      pendencias.find((p) => p.id === `sem-matricula-${aluno.id}`)?.tipo,
    ).toBe("aluno_sem_matricula");
  });
});

describe("getDashboardResumo (integração com o banco de teste)", () => {
  const dispositivosCriados: string[] = [];

  afterAll(async () => {
    await Promise.all(dispositivosCriados.map((id) => deleteDispositivo(id)));
  });

  it("soma a lotação das catracas ativas e calcula o percentual de ocupação consistentemente", async () => {
    const antes = await getDashboardResumo();

    const catraca = await createDispositivo({
      nome: "Catraca CI Teste Dashboard",
      local: undefined,
      tipo: "catraca",
      lotacaoMaxima: 37,
    });
    dispositivosCriados.push(catraca.id);

    const depois = await getDashboardResumo();

    expect(depois.ocupacao.lotacaoMaxima).toBe(
      antes.ocupacao.lotacaoMaxima + 37,
    );
    expect(depois.ocupacao.percentual).toBe(
      Math.round(
        (depois.ocupacao.pessoasNaAcademia / depois.ocupacao.lotacaoMaxima) *
          100,
      ),
    );
  });
});
