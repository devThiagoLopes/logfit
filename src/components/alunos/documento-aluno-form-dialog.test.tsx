import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockUploadDocumentoAlunoAction = vi.fn();
vi.mock("@/app/(dashboard)/alunos/documentos-actions", () => ({
  uploadDocumentoAlunoAction: (...args: unknown[]) =>
    mockUploadDocumentoAlunoAction(...args),
}));

import { DocumentoAlunoFormDialog } from "@/components/alunos/documento-aluno-form-dialog";

function criarArquivo(nome: string, tipo: string, tamanho = 1024) {
  const arquivo = new File(["x".repeat(tamanho)], nome, { type: tipo });
  return arquivo;
}

async function abrirDialog() {
  const user = userEvent.setup();
  render(<DocumentoAlunoFormDialog alunoId="aluno-1" />);
  await user.click(
    screen.getByRole("button", { name: "Anexar documento" }),
  );
  return user;
}

describe("DocumentoAlunoFormDialog", () => {
  it("não mostra o formulário antes de abrir o dialog", () => {
    render(<DocumentoAlunoFormDialog alunoId="aluno-1" />);
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
  });

  it("abre o dialog com os campos do formulário", async () => {
    await abrirDialog();
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição (opcional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Arquivo")).toBeInTheDocument();
  });

  it("bloqueia o envio sem título (validação do schema)", async () => {
    const user = await abrirDialog();

    await user.click(screen.getByRole("button", { name: "Anexar" }));

    expect(
      await screen.findByText("Informe um título"),
    ).toBeInTheDocument();
    expect(mockUploadDocumentoAlunoAction).not.toHaveBeenCalled();
  });

  it("bloqueia o envio sem arquivo selecionado", async () => {
    const user = await abrirDialog();

    await user.type(screen.getByLabelText("Título"), "Atestado médico");
    await user.click(screen.getByRole("button", { name: "Anexar" }));

    expect(
      await screen.findByText("Selecione um arquivo para anexar."),
    ).toBeInTheDocument();
    expect(mockUploadDocumentoAlunoAction).not.toHaveBeenCalled();
  });

  it("rejeita um tipo de arquivo não permitido antes de chamar a action", async () => {
    const user = await abrirDialog();

    await user.type(screen.getByLabelText("Título"), "Atestado médico");
    fireEvent.change(screen.getByLabelText("Arquivo"), {
      target: { files: [criarArquivo("a.txt", "text/plain")] },
    });
    await user.click(screen.getByRole("button", { name: "Anexar" }));

    expect(
      await screen.findByText(/Tipo de arquivo não permitido/),
    ).toBeInTheDocument();
    expect(mockUploadDocumentoAlunoAction).not.toHaveBeenCalled();
  });

  it("envia os dados corretos e fecha o dialog em caso de sucesso", async () => {
    mockUploadDocumentoAlunoAction.mockResolvedValue({ success: true });
    const user = await abrirDialog();

    await user.type(screen.getByLabelText("Título"), "Atestado médico");
    fireEvent.change(screen.getByLabelText("Arquivo"), {
      target: { files: [criarArquivo("atestado.pdf", "application/pdf")] },
    });
    await user.click(screen.getByRole("button", { name: "Anexar" }));

    await waitFor(() => {
      expect(mockUploadDocumentoAlunoAction).toHaveBeenCalledTimes(1);
    });

    const [alunoId, formData] = mockUploadDocumentoAlunoAction.mock.calls[0];
    expect(alunoId).toBe("aluno-1");
    expect(formData.get("titulo")).toBe("Atestado médico");
    expect((formData.get("arquivo") as File).name).toBe("atestado.pdf");

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
  });

  it("mostra o erro retornado pelo servidor e mantém o dialog aberto", async () => {
    mockUploadDocumentoAlunoAction.mockResolvedValue({
      error: "Erro ao anexar documento.",
    });
    const user = await abrirDialog();

    await user.type(screen.getByLabelText("Título"), "Atestado médico");
    fireEvent.change(screen.getByLabelText("Arquivo"), {
      target: { files: [criarArquivo("atestado.pdf", "application/pdf")] },
    });
    await user.click(screen.getByRole("button", { name: "Anexar" }));

    expect(
      await screen.findByText("Erro ao anexar documento."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
  });
});
