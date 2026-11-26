import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockGet = vi.fn();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string) => ({
    url: `https://blob.vercel-storage.com/${pathname}`,
  })),
  del: vi.fn(async () => undefined),
  get: (...args: unknown[]) => mockGet(...args),
}));

import { GET } from "@/app/(dashboard)/alunos/documentos/[documentoId]/route";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createAluno, deleteAluno } from "@/services/alunos";
import { createDocumentoAluno } from "@/services/documentos-aluno";

function cpfAleatorio() {
  const n = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-00`;
}

function streamDeTexto(texto: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(texto));
      controller.close();
    },
  });
}

describe("GET /alunos/documentos/[documentoId] (integração com o banco de teste)", () => {
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
      nome: "Aluno CI Teste Download",
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

  async function criarUsuarioDeTeste(role: "admin" | "instrutor" | "aluno") {
    const id = randomUUID();
    await getDb()
      .insert(user)
      .values({ id, name: "Usuário CI Teste", email: `${id}@logfit.com`, role });
    usuariosCriados.push(id);
    return id;
  }

  function sessaoComRole(role: string, id: string) {
    mockGetSession.mockResolvedValue({ user: { id, role } });
  }

  function contexto(documentoId: string) {
    return { params: Promise.resolve({ documentoId }) };
  }

  it("retorna 404 sem sessão", async () => {
    mockGetSession.mockResolvedValue(null);

    const resposta = await GET(new Request("http://localhost"), contexto("x"));

    expect(resposta.status).toBe(404);
  });

  it("retorna 404 quando o usuário é aluno", async () => {
    const id = await criarUsuarioDeTeste("aluno");
    sessaoComRole("aluno", id);

    const resposta = await GET(new Request("http://localhost"), contexto("x"));

    expect(resposta.status).toBe(404);
  });

  it("retorna 404 quando o documento não existe", async () => {
    const id = await criarUsuarioDeTeste("admin");
    sessaoComRole("admin", id);

    const resposta = await GET(
      new Request("http://localhost"),
      contexto("00000000-0000-0000-0000-000000000000"),
    );

    expect(resposta.status).toBe(404);
  });

  it("retorna 404 quando o blob não é encontrado", async () => {
    const criadoPorId = await criarUsuarioDeTeste("admin");
    sessaoComRole("admin", criadoPorId);
    const aluno = await criarAlunoDeTeste();
    const documento = await createDocumentoAluno({
      alunoId: aluno.id,
      titulo: "Documento",
      file: new File(["x"], "a.pdf", { type: "application/pdf" }),
      criadoPorId,
    });
    mockGet.mockResolvedValue(null);

    const resposta = await GET(
      new Request("http://localhost"),
      contexto(documento.id),
    );

    expect(resposta.status).toBe(404);
  });

  it("serve o arquivo privado com os headers corretos", async () => {
    const criadoPorId = await criarUsuarioDeTeste("instrutor");
    sessaoComRole("instrutor", criadoPorId);
    const aluno = await criarAlunoDeTeste();
    const documento = await createDocumentoAluno({
      alunoId: aluno.id,
      titulo: "Documento",
      file: new File(["conteúdo"], "atestado.pdf", {
        type: "application/pdf",
      }),
      criadoPorId,
    });
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: streamDeTexto("conteúdo"),
    });

    const resposta = await GET(
      new Request("http://localhost"),
      contexto(documento.id),
    );

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Content-Type")).toBe("application/pdf");
    expect(resposta.headers.get("Content-Disposition")).toBe(
      'inline; filename="atestado.pdf"',
    );
    expect(await resposta.text()).toBe("conteúdo");
  });
});
