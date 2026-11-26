import { describe, expect, it } from "vitest";

import {
  labelDuracao,
  mesesDaPeriodicidade,
  sufixoCobranca,
  sugerirDataVencimento,
} from "@/constants/periodicidade";

describe("mesesDaPeriodicidade", () => {
  it("retorna null para diária", () => {
    expect(mesesDaPeriodicidade("diaria")).toBeNull();
  });

  it("retorna o número de meses para as demais periodicidades", () => {
    expect(mesesDaPeriodicidade("mensal")).toBe(1);
    expect(mesesDaPeriodicidade("bimestral")).toBe(2);
    expect(mesesDaPeriodicidade("trimestral")).toBe(3);
    expect(mesesDaPeriodicidade("quadrimestral")).toBe(4);
    expect(mesesDaPeriodicidade("semestral")).toBe(6);
    expect(mesesDaPeriodicidade("anual")).toBe(12);
  });
});

describe("sufixoCobranca", () => {
  it("retorna o sufixo correto para cada periodicidade", () => {
    expect(sufixoCobranca("diaria")).toBe("por dia");
    expect(sufixoCobranca("mensal")).toBe("por mês");
    expect(sufixoCobranca("anual")).toBe("por ano");
  });
});

describe("labelDuracao", () => {
  it("retorna '1 dia' para diária", () => {
    expect(labelDuracao("diaria")).toBe("1 dia");
  });

  it("retorna '1 mês' (singular) para mensal", () => {
    expect(labelDuracao("mensal")).toBe("1 mês");
  });

  it("retorna '<N> meses' (plural) para as demais", () => {
    expect(labelDuracao("trimestral")).toBe("3 meses");
    expect(labelDuracao("anual")).toBe("12 meses");
  });
});

describe("sugerirDataVencimento", () => {
  it("soma 1 dia para periodicidade diária", () => {
    const inicio = new Date("2026-01-15T00:00:00.000Z");
    const resultado = sugerirDataVencimento("diaria", inicio);
    expect(resultado.toISOString().slice(0, 10)).toBe("2026-01-16");
  });

  it("soma os meses correspondentes para as demais periodicidades", () => {
    const inicio = new Date("2026-01-15T00:00:00.000Z");
    expect(
      sugerirDataVencimento("mensal", inicio).toISOString().slice(0, 10),
    ).toBe("2026-02-15");
    expect(
      sugerirDataVencimento("anual", inicio).toISOString().slice(0, 10),
    ).toBe("2027-01-15");
  });

  it("não modifica a data de início recebida", () => {
    const inicio = new Date("2026-01-15T00:00:00.000Z");
    sugerirDataVencimento("mensal", inicio);
    expect(inicio.toISOString().slice(0, 10)).toBe("2026-01-15");
  });
});
