import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PendenciasPanel } from "@/components/dashboard/pendencias-panel";
import type { Pendencia } from "@/services/dashboard";

describe("PendenciasPanel", () => {
  it("mostra a mensagem de 'nenhuma pendência' quando a lista está vazia", () => {
    render(<PendenciasPanel pendencias={[]} />);
    expect(
      screen.getByText("Nenhuma pendência no momento."),
    ).toBeInTheDocument();
  });

  it("renderiza cada pendência com título, descrição e link", () => {
    const pendencias: Pendencia[] = [
      {
        id: "pagamento-1",
        tipo: "pagamento_atrasado",
        titulo: "Fulano de Tal",
        descricao: "Pagamento atrasado há 3 dias · R$ 100,00",
        href: "/pagamentos",
      },
      {
        id: "sem-matricula-1",
        tipo: "aluno_sem_matricula",
        titulo: "Ciclano",
        descricao: "Aluno ativo sem matrícula vigente",
        href: "/alunos",
      },
    ];

    render(<PendenciasPanel pendencias={pendencias} />);

    const linkPagamento = screen.getByRole("link", { name: /Fulano de Tal/ });
    expect(linkPagamento).toHaveAttribute("href", "/pagamentos");
    expect(
      screen.getByText("Pagamento atrasado há 3 dias · R$ 100,00"),
    ).toBeInTheDocument();

    const linkAluno = screen.getByRole("link", { name: /Ciclano/ });
    expect(linkAluno).toHaveAttribute("href", "/alunos");
    expect(
      screen.getByText("Aluno ativo sem matrícula vigente"),
    ).toBeInTheDocument();
  });
});
