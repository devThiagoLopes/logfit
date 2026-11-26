import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string) => ({
    url: `https://blob.vercel-storage.com/${pathname}`,
  })),
  del: vi.fn(async () => undefined),
}));

import {
  deleteDocumentoAlunoAction,
  uploadDocumentoAlunoAction,
} from "@/app/(dashboard)/alunos/documentos-actions";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createAluno, deleteAluno } from "@/services/alunos";
import {
  createDocumentoAluno,
  getDocumentoAlunoById,
} from "@/services/documentos-aluno";

describe("documentos-actions (integração com o banco de teste)", () => {
  const alunosCriados: string[] = [];
  const usuariosCriados: string[] = [];

  afterAll(async () => {
    await Promise.all(alunosCriados.map((id) => deleteAluno(id)));
    await Promise.all(
      usuariosCriados.map((id) => getDb().delete(user).where(eq(user.id, id))),
    );
  });

  async function criarAlunoDeTeste() {
    const aluno = await createAluno({
      nome: "Aluno CI Teste Actions",
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
      cpf: `${Math.floor(Math.random() * 900 + 100)}.654.321-00`,
      situacao: "ativo",
      debito: 0,
    });
    alunosCriados.push(aluno.id);
    return aluno;
  }

  async function criarUsuarioDeTeste(role: "admin" | "instrutor" | "aluno") {
    const id = randomUUID();
    await getDb()
      .insert(user)
      .values({ id, name: "Usuário CI Teste", email: `${id}@logfit.com`, role });
    usuariosCriados.push(id);
    return id;
  }

  function arquivo(nome: string, tipo: string) {
    return new File(["conteúdo"], nome, { type: tipo });
  }

  function sessaoComRole(role: string, id: string) {
    mockGetSession.mockResolvedValue({ user: { id, role } });
  }

  describe("uploadDocumentoAlunoAction", () => {
    it("bloqueia quando não há sessão", async () => {
      mockGetSession.mockResolvedValue(null);

      const resultado = await uploadDocumentoAlunoAction(
        "qualquer-id",
        new FormData(),
      );

      expect(resultado).toEqual({
        error: "Você não tem permissão para anexar documentos.",
      });
    });

    it("bloqueia quando o usuário é aluno", async () => {
      const id = await criarUsuarioDeTeste("aluno");
      sessaoComRole("aluno", id);

      const resultado = await uploadDocumentoAlunoAction(
        "qualquer-id",
        new FormData(),
      );

      expect(resultado.error).toBeDefined();
    });

    it("rejeita quando falta o título", async () => {
      const criadoPorId = await criarUsuarioDeTeste("admin");
      sessaoComRole("admin", criadoPorId);
      const aluno = await criarAlunoDeTeste();

      const formData = new FormData();
      formData.set("arquivo", arquivo("a.pdf", "application/pdf"));

      const resultado = await uploadDocumentoAlunoAction(aluno.id, formData);

      expect(resultado.error).toBeDefined();
    });

    it("rejeita quando falta o arquivo", async () => {
      const criadoPorId = await criarUsuarioDeTeste("instrutor");
      sessaoComRole("instrutor", criadoPorId);
      const aluno = await criarAlunoDeTeste();

      const formData = new FormData();
      formData.set("titulo", "Atestado médico");

      const resultado = await uploadDocumentoAlunoAction(aluno.id, formData);

      expect(resultado).toEqual({
        error: "Selecione um arquivo para anexar.",
      });
    });

    it("rejeita tipo de arquivo não permitido", async () => {
      const criadoPorId = await criarUsuarioDeTeste("admin");
      sessaoComRole("admin", criadoPorId);
      const aluno = await criarAlunoDeTeste();

      const formData = new FormData();
      formData.set("titulo", "Atestado médico");
      formData.set("arquivo", arquivo("a.txt", "text/plain"));

      const resultado = await uploadDocumentoAlunoAction(aluno.id, formData);

      expect(resultado.error).toContain("Tipo de arquivo não permitido");
    });

    it("cria o documento com sucesso para admin/instrutor", async () => {
      const criadoPorId = await criarUsuarioDeTeste("admin");
      sessaoComRole("admin", criadoPorId);
      const aluno = await criarAlunoDeTeste();

      const formData = new FormData();
      formData.set("titulo", "Atestado médico");
      formData.set("descricao", "Válido até 2027");
      formData.set("arquivo", arquivo("atestado.pdf", "application/pdf"));

      const resultado = await uploadDocumentoAlunoAction(aluno.id, formData);

      expect(resultado).toEqual({ success: true });
    });
  });

  describe("deleteDocumentoAlunoAction", () => {
    it("bloqueia quando o usuário não tem permissão", async () => {
      const criadoPorId = await criarUsuarioDeTeste("admin");
      sessaoComRole("admin", criadoPorId);
      const aluno = await criarAlunoDeTeste();
      const documento = await createDocumentoAluno({
        alunoId: aluno.id,
        titulo: "Documento",
        file: arquivo("doc.pdf", "application/pdf"),
        criadoPorId,
      });

      sessaoComRole("aluno", criadoPorId);
      const resultado = await deleteDocumentoAlunoAction(
        documento.id,
        aluno.id,
      );

      expect(resultado.error).toBeDefined();
      expect(await getDocumentoAlunoById(documento.id)).toBeDefined();
    });

    it("retorna erro quando o documento não pertence ao aluno informado", async () => {
      const criadoPorId = await criarUsuarioDeTeste("admin");
      sessaoComRole("admin", criadoPorId);
      const aluno = await criarAlunoDeTeste();
      const outroAluno = await criarAlunoDeTeste();
      const documento = await createDocumentoAluno({
        alunoId: aluno.id,
        titulo: "Documento",
        file: arquivo("doc.pdf", "application/pdf"),
        criadoPorId,
      });

      const resultado = await deleteDocumentoAlunoAction(
        documento.id,
        outroAluno.id,
      );

      expect(resultado).toEqual({ error: "Documento não encontrado." });
    });

    it("exclui o documento com sucesso", async () => {
      const criadoPorId = await criarUsuarioDeTeste("instrutor");
      sessaoComRole("instrutor", criadoPorId);
      const aluno = await criarAlunoDeTeste();
      const documento = await createDocumentoAluno({
        alunoId: aluno.id,
        titulo: "Documento",
        file: arquivo("doc.pdf", "application/pdf"),
        criadoPorId,
      });

      const resultado = await deleteDocumentoAlunoAction(
        documento.id,
        aluno.id,
      );

      expect(resultado).toEqual({ success: true });
      expect(await getDocumentoAlunoById(documento.id)).toBeUndefined();
    });
  });
});
