import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(dashboard)/checkin/actions", () => ({
  getCheckinsRecentesAction: vi
    .fn()
    .mockResolvedValue({ success: true, checkins: [] }),
}));

import { CheckinLivePanel } from "@/components/checkin/checkin-live-panel";

function renderComProvider(
  props: React.ComponentProps<typeof CheckinLivePanel>,
) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckinLivePanel {...props} />
    </QueryClientProvider>,
  );
}

describe("CheckinLivePanel", () => {
  it("mostra o estado vazio quando não há check-ins", () => {
    renderComProvider({ initialCheckins: [] });
    expect(
      screen.getByText("Nenhum acesso registrado ainda."),
    ).toBeInTheDocument();
  });

  it("renderiza um check-in liberado com o nome do aluno e do dispositivo", () => {
    renderComProvider({
      initialCheckins: [
        {
          id: "c-1",
          liberado: true,
          motivo: null,
          sentido: "entrada",
          identificadorValor: "123",
          ocorridoEm: new Date("2026-11-20T10:00:00.000Z"),
          alunoNome: "Fulano de Tal",
          dispositivoNome: "Catraca Principal",
        },
      ],
    });

    expect(screen.getByText("Fulano de Tal")).toBeInTheDocument();
    expect(screen.getByText("Catraca Principal")).toBeInTheDocument();
  });

  it("mostra o motivo quando o acesso é negado", () => {
    renderComProvider({
      initialCheckins: [
        {
          id: "c-2",
          liberado: false,
          motivo: "Pagamento em atraso.",
          sentido: null,
          identificadorValor: "456",
          ocorridoEm: new Date("2026-11-20T10:05:00.000Z"),
          alunoNome: "Ciclano",
          dispositivoNome: "Catraca Principal",
        },
      ],
    });

    expect(
      screen.getByText("Catraca Principal · Pagamento em atraso."),
    ).toBeInTheDocument();
  });

  it("usa o identificador quando o aluno não é identificado", () => {
    renderComProvider({
      initialCheckins: [
        {
          id: "c-3",
          liberado: false,
          motivo: "Aluno não encontrado.",
          sentido: null,
          identificadorValor: "999",
          ocorridoEm: new Date("2026-11-20T10:10:00.000Z"),
          alunoNome: null,
          dispositivoNome: "Catraca Principal",
        },
      ],
    });

    expect(screen.getByText("Não identificado — 999")).toBeInTheDocument();
  });
});
