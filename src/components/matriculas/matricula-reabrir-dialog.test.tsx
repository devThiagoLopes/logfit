import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockReabrirMatriculaAction = vi.fn();
vi.mock("@/app/(dashboard)/matriculas/actions", () => ({
  reabrirMatriculaAction: (...args: unknown[]) =>
    mockReabrirMatriculaAction(...args),
}));

import { MatriculaReabrirDialog } from "@/components/matriculas/matricula-reabrir-dialog";

function abrir() {
  return (
    <MatriculaReabrirDialog
      matriculaId="m-1"
      alunoNome="Fulano de Tal"
      trigger={<button type="button">Abrir</button>}
    />
  );
}

describe("MatriculaReabrirDialog", () => {
  it("abre a confirmação com o nome do aluno", async () => {
    const user = userEvent.setup();
    render(abrir());

    await user.click(screen.getByRole("button", { name: "Abrir" }));

    expect(
      screen.getByText(/reabrir a matrícula de Fulano de Tal/),
    ).toBeInTheDocument();
  });

  it("reabre com sucesso e fecha o dialog", async () => {
    mockReabrirMatriculaAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(abrir());

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      screen.getByRole("button", { name: "Reabrir matrícula" }),
    );

    await waitFor(() => {
      expect(mockReabrirMatriculaAction).toHaveBeenCalledWith("m-1");
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("mostra o erro vindo do servidor (ex: prazo expirado) e mantém o dialog aberto", async () => {
    mockReabrirMatriculaAction.mockResolvedValue({
      error: "O prazo de 10 dias para reabrir esta matrícula já expirou.",
    });
    const user = userEvent.setup();
    render(abrir());

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      screen.getByRole("button", { name: "Reabrir matrícula" }),
    );

    expect(
      await screen.findByText(
        "O prazo de 10 dias para reabrir esta matrícula já expirou.",
      ),
    ).toBeInTheDocument();
  });
});
