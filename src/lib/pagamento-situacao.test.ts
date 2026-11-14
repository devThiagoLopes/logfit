import { afterEach, describe, expect, it, vi } from "vitest";

import { estaVencido, getSituacaoPagamento } from "@/lib/pagamento-situacao";

describe("estaVencido", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("não considera atrasado no próprio dia do vencimento, mesmo após o horário exato", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 20, 0));
    expect(estaVencido(new Date(2026, 10, 10, 8, 0))).toBe(false);
  });

  it("não considera atrasado no mesmo dia antes do horário exato do vencimento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 8, 0));
    expect(estaVencido(new Date(2026, 10, 10, 20, 0))).toBe(false);
  });

  it("considera atrasado a partir do dia seguinte de madrugada, mesmo que o vencimento original fosse tarde", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 0, 5));
    expect(estaVencido(new Date(2026, 10, 10, 23, 59))).toBe(true);
  });

  it("não considera atrasado antes do dia do vencimento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 23, 59));
    expect(estaVencido(new Date(2026, 10, 10, 0, 1))).toBe(false);
  });
});

describe("getSituacaoPagamento", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna pago quando status é pago, mesmo com vencimento no passado", () => {
    expect(getSituacaoPagamento("pago", new Date(2020, 0, 1))).toBe("pago");
  });

  it("retorna pendente quando ainda não passou o dia do vencimento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 10, 0));
    expect(getSituacaoPagamento("pendente", new Date(2026, 10, 10, 20, 0))).toBe(
      "pendente",
    );
  });

  it("retorna atrasado quando passou o dia civil do vencimento e não foi pago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 0, 5));
    expect(getSituacaoPagamento("pendente", new Date(2026, 10, 10, 23, 59))).toBe(
      "atrasado",
    );
  });
});
