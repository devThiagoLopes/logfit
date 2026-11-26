import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string) => ({
    url: `https://blob.vercel-storage.com/${pathname}`,
  })),
  del: vi.fn(async () => undefined),
}));

import { del, put } from "@vercel/blob";

import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createAluno, deleteAluno } from "@/services/alunos";
import {
  createDocumentoAluno,
  deleteDocumentoAluno,
  getDocumentoAlunoById,
  getDocumentosByAluno,
} from "@/services/documentos-aluno";

function cpfAleatorio() {
  const n = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-00`;
}

describe("service de documentos do aluno (integração com o banco de teste)", () => {
  const alunosCriados: string[] = [];
  const usuariosCriados: string[] = [];

  afterAll(async () => {
    await Promise.all(alunosCriados.map((id) => deleteAluno(id)));
    await Promise.all(
      usuariosCriados.map((id) =>
        getDb().delete(user).where(eq(user.id, id)),
      ),
    );
  });

  async function criarAlunoDeTeste() {
    const aluno = await createAluno({
      nome: "Aluno CI Teste Documentos",
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

  async function criarUsuarioDeTeste() {
    const id = randomUUID();
    await getDb()
      .insert(user)
      .values({ id, name: "Instrutor CI Teste", email: `${id}@logfit.com` });
    usuariosCriados.push(id);
    return id;
  }

  function arquivo(nome: string, tipo: string, conteudo: string) {
    return new File([conteudo], nome, { type: tipo });
  }

  it("cria um documento, faz upload privado e aparece na listagem do aluno", async () => {
    const aluno = await criarAlunoDeTeste();
    const criadoPorId = await criarUsuarioDeTeste();

    const documento = await createDocumentoAluno({
      alunoId: aluno.id,
      titulo: "Atestado médico",
      descricao: "Válido até 2027",
      file: arquivo("atestado.pdf", "application/pdf", "conteúdo de teste"),
      criadoPorId,
    });

    expect(put).toHaveBeenCalledWith(
      "atestado.pdf",
      expect.anything(),
      expect.objectContaining({ access: "private", addRandomSuffix: true }),
    );
    expect(documento.blobUrl).toBe(
      "https://blob.vercel-storage.com/atestado.pdf",
    );

    const documentos = await getDocumentosByAluno(aluno.id);
    expect(documentos).toHaveLength(1);
    expect(documentos[0]?.titulo).toBe("Atestado médico");
    expect(documentos[0]?.descricao).toBe("Válido até 2027");
    expect(documentos[0]?.mimeType).toBe("application/pdf");
  });

  it("ordena os documentos do mais recente para o mais antigo", async () => {
    const aluno = await criarAlunoDeTeste();
    const criadoPorId = await criarUsuarioDeTeste();

    const primeiro = await createDocumentoAluno({
      alunoId: aluno.id,
      titulo: "Primeiro documento",
      file: arquivo("a.pdf", "application/pdf", "a"),
      criadoPorId,
    });
    const segundo = await createDocumentoAluno({
      alunoId: aluno.id,
      titulo: "Segundo documento",
      file: arquivo("b.pdf", "application/pdf", "b"),
      criadoPorId,
    });

    const documentos = await getDocumentosByAluno(aluno.id);

    expect(documentos.map((d) => d.id)).toEqual([segundo.id, primeiro.id]);
  });

  it("exclui o documento do banco e remove o arquivo do blob", async () => {
    const aluno = await criarAlunoDeTeste();
    const criadoPorId = await criarUsuarioDeTeste();

    const documento = await createDocumentoAluno({
      alunoId: aluno.id,
      titulo: "Para excluir",
      file: arquivo("excluir.pdf", "application/pdf", "x"),
      criadoPorId,
    });

    await deleteDocumentoAluno(documento.id);

    expect(del).toHaveBeenCalledWith(documento.blobUrl);
    expect(await getDocumentoAlunoById(documento.id)).toBeUndefined();
  });

  it("excluir um documento inexistente não lança erro", async () => {
    await expect(
      deleteDocumentoAluno("00000000-0000-0000-0000-000000000000"),
    ).resolves.toBeUndefined();
  });
});
