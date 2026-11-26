import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DocumentoAluno } from "@/lib/db/documento-aluno-schema";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockDeleteDocumentoAlunoAction = vi.fn();
vi.mock("@/app/(dashboard)/alunos/documentos-actions", () => ({
  deleteDocumentoAlunoAction: (...args: unknown[]) =>
    mockDeleteDocumentoAlunoAction(...args),
}));

import { DocumentosAlunoList } from "@/components/alunos/documentos-aluno-list";

function criarDocumento(
  overrides: Partial<DocumentoAluno> = {},
): DocumentoAluno {
  return {
    id: "doc-1",
    alunoId: "aluno-1",
    titulo: "Atestado médico",
    descricao: "Válido até 2027",
    blobUrl: "https://blob.vercel-storage.com/atestado.pdf",
    nomeArquivo: "atestado.pdf",
    mimeType: "application/pdf",
    tamanhoBytes: 2048,
    criadoPorId: "user-1",
    createdAt: new Date("2026-11-20T00:00:00.000Z"),
    ...overrides,
  };
}

describe("DocumentosAlunoList", () => {
  it("mostra o estado vazio quando não há documentos", () => {
    render(<DocumentosAlunoList documentos={[]} />);
    expect(
      screen.getByText("Nenhum documento anexado ainda"),
    ).toBeInTheDocument();
  });

  it("renderiza título, descrição e link de download do documento", () => {
    render(<DocumentosAlunoList documentos={[criarDocumento()]} />);

    const link = screen.getByRole("link", { name: "Atestado médico" });
    expect(link).toHaveAttribute("href", "/alunos/documentos/doc-1");
    expect(screen.getByText("Válido até 2027")).toBeInTheDocument();
  });

  it("abre a confirmação de exclusão com o título do documento", async () => {
    const user = userEvent.setup();
    render(<DocumentosAlunoList documentos={[criarDocumento()]} />);

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));

    expect(screen.getByText("Excluir documento")).toBeInTheDocument();
    expect(
      screen.getByText(/deseja excluir "Atestado médico"/),
    ).toBeInTheDocument();
  });

  it("exclui o documento com sucesso", async () => {
    mockDeleteDocumentoAlunoAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<DocumentosAlunoList documentos={[criarDocumento()]} />);

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => {
      expect(mockDeleteDocumentoAlunoAction).toHaveBeenCalledWith(
        "doc-1",
        "aluno-1",
      );
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("mostra o erro retornado pelo servidor ao falhar a exclusão", async () => {
    mockDeleteDocumentoAlunoAction.mockResolvedValue({
      error: "Erro ao excluir documento.",
    });
    const user = userEvent.setup();
    render(<DocumentosAlunoList documentos={[criarDocumento()]} />);

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText("Erro ao excluir documento."),
    ).toBeInTheDocument();
  });
});
