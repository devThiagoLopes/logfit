import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockCancelarMatriculaAction = vi.fn();
vi.mock("@/app/(dashboard)/matriculas/actions", () => ({
  cancelarMatriculaAction: (...args: unknown[]) =>
    mockCancelarMatriculaAction(...args),
}));

import { MatriculaCancelarDialog } from "@/components/matriculas/matricula-cancelar-dialog";

function abrir() {
  return (
    <MatriculaCancelarDialog
      matriculaId="m-1"
      alunoNome="Fulano de Tal"
      trigger={<button type="button">Abrir</button>}
    />
  );
}

describe("MatriculaCancelarDialog", () => {
  it("abre a confirmação com o nome do aluno", async () => {
    const user = userEvent.setup();
    render(abrir());

    await user.click(screen.getByRole("button", { name: "Abrir" }));

    expect(
      screen.getByText(/cancelar a matrícula de Fulano de Tal/),
    ).toBeInTheDocument();
  });

  it("cancela com sucesso e fecha o dialog", async () => {
    mockCancelarMatriculaAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(abrir());

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      screen.getByRole("button", { name: "Cancelar matrícula" }),
    );

    await waitFor(() => {
      expect(mockCancelarMatriculaAction).toHaveBeenCalledWith("m-1");
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("mostra o erro vindo do servidor (ex: prazo expirado) e mantém o dialog aberto", async () => {
    mockCancelarMatriculaAction.mockResolvedValue({
      error: "Esta matrícula já está cancelada.",
    });
    const user = userEvent.setup();
    render(abrir());

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      screen.getByRole("button", { name: "Cancelar matrícula" }),
    );

    expect(
      await screen.findByText("Esta matrícula já está cancelada."),
    ).toBeInTheDocument();
  });
});
