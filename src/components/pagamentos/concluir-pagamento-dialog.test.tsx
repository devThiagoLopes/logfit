import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockConcluirPagamentoAction = vi.fn();
vi.mock("@/app/(dashboard)/pagamentos/actions", () => ({
  concluirPagamentoAction: (...args: unknown[]) =>
    mockConcluirPagamentoAction(...args),
}));

import { ConcluirPagamentoDialog } from "@/components/pagamentos/concluir-pagamento-dialog";

function abrir() {
  return (
    <ConcluirPagamentoDialog
      pagamentoId="p-1"
      alunoNome="Fulano de Tal"
      valor="150.00"
    />
  );
}

async function abrirESelecionarFormaPagamento(label: string) {
  const user = userEvent.setup();
  render(abrir());

  await user.click(screen.getByRole("button", { name: "Concluir" }));
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: label }));

  return user;
}

describe("ConcluirPagamentoDialog", () => {
  it("abre o dialog mostrando o valor formatado e o nome do aluno", async () => {
    const user = userEvent.setup();
    render(abrir());

    await user.click(screen.getByRole("button", { name: "Concluir" }));

    expect(
      screen.getByText(/forma de pagamento utilizada por Fulano de Tal/),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 150,00")).toBeInTheDocument();
  });

  it("bloqueia o envio sem selecionar a forma de pagamento", async () => {
    const user = userEvent.setup();
    render(abrir());

    await user.click(screen.getByRole("button", { name: "Concluir" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );

    // O placeholder do select já mostra esse mesmo texto, então a mensagem
    // de erro do schema aparece duplicada no documento — espera até que
    // apareça uma segunda ocorrência (a mensagem de erro em si).
    await waitFor(() => {
      expect(
        screen.getAllByText("Selecione a forma de pagamento"),
      ).toHaveLength(2);
    });
    expect(mockConcluirPagamentoAction).not.toHaveBeenCalled();
  });

  it("envia a forma de pagamento selecionada e fecha o dialog em caso de sucesso", async () => {
    mockConcluirPagamentoAction.mockResolvedValue({ status: "pago" });
    const user = await abrirESelecionarFormaPagamento("Pix");

    await user.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );

    await waitFor(() => {
      expect(mockConcluirPagamentoAction).toHaveBeenCalledWith("p-1", {
        formaPagamento: "pix",
      });
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("mostra o erro de parcela anterior pendente vindo do servidor", async () => {
    mockConcluirPagamentoAction.mockResolvedValue({
      error:
        "Existe uma parcela anterior pendente nesta matrícula. Confirme-a antes desta.",
    });
    const user = await abrirESelecionarFormaPagamento("Dinheiro");

    await user.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );

    expect(
      await screen.findByText(
        "Existe uma parcela anterior pendente nesta matrícula. Confirme-a antes desta.",
      ),
    ).toBeInTheDocument();
  });
});
