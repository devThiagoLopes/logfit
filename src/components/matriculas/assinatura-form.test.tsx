import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockAssinarMatriculaAction = vi.fn();
vi.mock("@/app/assinar/[token]/actions", () => ({
  assinarMatriculaAction: (...args: unknown[]) =>
    mockAssinarMatriculaAction(...args),
}));

vi.mock("@/components/matriculas/signature-pad", () => ({
  SignaturePad: ({ onChange }: { onChange: (v: string | null) => void }) => (
    <button
      type="button"
      onClick={() => onChange("data:image/png;base64,fake")}
    >
      Simular assinatura
    </button>
  ),
}));

import { AssinaturaForm } from "@/components/matriculas/assinatura-form";

describe("AssinaturaForm", () => {
  it("preenche o nome sugerido", () => {
    render(<AssinaturaForm token="tok-1" nomeSugerido="Fulano de Tal" />);
    expect(screen.getByLabelText("Nome completo")).toHaveValue(
      "Fulano de Tal",
    );
  });

  it("bloqueia o envio sem assinatura e sem concordar com a declaração", async () => {
    const user = userEvent.setup();
    render(<AssinaturaForm token="tok-1" nomeSugerido="Fulano de Tal" />);

    await user.click(
      screen.getByRole("button", { name: "Assinar documento" }),
    );

    expect(
      await screen.findByText("Assine no painel digital para continuar"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "É necessário confirmar a declaração para assinar",
      ),
    ).toBeInTheDocument();
    expect(mockAssinarMatriculaAction).not.toHaveBeenCalled();
  });

  it("assina com sucesso e mostra a tela de confirmação", async () => {
    mockAssinarMatriculaAction.mockResolvedValue({ status: "assinada" });
    const user = userEvent.setup();
    render(<AssinaturaForm token="tok-1" nomeSugerido="Fulano de Tal" />);

    await user.click(
      screen.getByRole("button", { name: "Simular assinatura" }),
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Assinar documento" }),
    );

    await waitFor(() => {
      expect(mockAssinarMatriculaAction).toHaveBeenCalledWith("tok-1", {
        nome: "Fulano de Tal",
        assinaturaImagem: "data:image/png;base64,fake",
        concordo: true,
      });
    });

    expect(
      await screen.findByText("Documento assinado com sucesso!"),
    ).toBeInTheDocument();
  });

  it("mostra o erro retornado pelo servidor e permanece no formulário", async () => {
    mockAssinarMatriculaAction.mockResolvedValue({
      error: "Matrícula não encontrada.",
    });
    const user = userEvent.setup();
    render(<AssinaturaForm token="tok-1" nomeSugerido="Fulano de Tal" />);

    await user.click(
      screen.getByRole("button", { name: "Simular assinatura" }),
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Assinar documento" }),
    );

    expect(
      await screen.findByText("Matrícula não encontrada."),
    ).toBeInTheDocument();
  });
});
