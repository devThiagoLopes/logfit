import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockConfirmarRematriculaAction = vi.fn();
vi.mock("@/app/(dashboard)/matriculas/actions", () => ({
  confirmarRematriculaAction: (...args: unknown[]) =>
    mockConfirmarRematriculaAction(...args),
}));

import { MatriculaConfirmarRematriculaDialog } from "@/components/matriculas/matricula-confirmar-rematricula-dialog";

describe("MatriculaConfirmarRematriculaDialog", () => {
  it("abre a confirmação com o nome do aluno", async () => {
    const user = userEvent.setup();
    render(
      <MatriculaConfirmarRematriculaDialog
        matriculaId="m-1"
        alunoNome="Fulano de Tal"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Confirmar rematrícula" }),
    );

    expect(
      screen.getByText(/A matrícula de Fulano de Tal venceu/),
    ).toBeInTheDocument();
  });

  it("confirma com sucesso e fecha o dialog", async () => {
    mockConfirmarRematriculaAction.mockResolvedValue({ id: "m-1" });
    const user = userEvent.setup();
    render(
      <MatriculaConfirmarRematriculaDialog
        matriculaId="m-1"
        alunoNome="Fulano de Tal"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Confirmar rematrícula" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar rematrícula" }),
    );

    await waitFor(() => {
      expect(mockConfirmarRematriculaAction).toHaveBeenCalledWith("m-1");
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("mostra o erro vindo do servidor e mantém o dialog aberto", async () => {
    mockConfirmarRematriculaAction.mockResolvedValue({
      error:
        "Esta matrícula ainda não venceu, não há rematrícula a confirmar.",
    });
    const user = userEvent.setup();
    render(
      <MatriculaConfirmarRematriculaDialog
        matriculaId="m-1"
        alunoNome="Fulano de Tal"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Confirmar rematrícula" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar rematrícula" }),
    );

    expect(
      await screen.findByText(
        "Esta matrícula ainda não venceu, não há rematrícula a confirmar.",
      ),
    ).toBeInTheDocument();
  });
});
