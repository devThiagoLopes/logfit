import { describe, expect, it } from "vitest";

import { getSituacaoMatricula, podeReabrirMatricula } from "@/lib/matricula-situacao";

describe("getSituacaoMatricula", () => {
  it("retorna 'cancelada' quando o status é cancelada, mesmo com data futura", () => {
    const futuro = new Date(Date.now() + 86_400_000);
    expect(getSituacaoMatricula("cancelada", futuro)).toBe("cancelada");
  });

  it("retorna 'aguardando_assinatura' quando o status não é assinada", () => {
    expect(getSituacaoMatricula("aguardando_assinatura", null)).toBe(
      "aguardando_assinatura",
    );
  });

  it("retorna 'ativa' quando assinada e sem data de expiração", () => {
    expect(getSituacaoMatricula("assinada", null)).toBe("ativa");
  });

  it("retorna 'ativa' quando assinada e a expiração ainda não chegou", () => {
    const futuro = new Date(Date.now() + 86_400_000);
    expect(getSituacaoMatricula("assinada", futuro)).toBe("ativa");
  });

  it("retorna 'expirada' quando assinada e a expiração já passou", () => {
    const passado = new Date(Date.now() - 86_400_000);
    expect(getSituacaoMatricula("assinada", passado)).toBe("expirada");
  });

  it("aceita dataExpiracao como string", () => {
    const passado = new Date(Date.now() - 86_400_000).toISOString();
    expect(getSituacaoMatricula("assinada", passado)).toBe("expirada");
  });
});

describe("podeReabrirMatricula", () => {
  it("retorna false quando o status não é cancelada", () => {
    expect(podeReabrirMatricula("assinada", new Date())).toBe(false);
  });

  it("retorna false quando canceladaEm é null", () => {
    expect(podeReabrirMatricula("cancelada", null)).toBe(false);
  });

  it("retorna true dentro do prazo de 10 dias", () => {
    const canceladaEm = new Date(Date.now() - 5 * 86_400_000);
    expect(podeReabrirMatricula("cancelada", canceladaEm)).toBe(true);
  });

  it("retorna true no limite exato do prazo", () => {
    const canceladaEm = new Date(Date.now() - 10 * 86_400_000);
    expect(podeReabrirMatricula("cancelada", canceladaEm)).toBe(true);
  });

  it("retorna false fora do prazo de 10 dias", () => {
    const canceladaEm = new Date(Date.now() - 11 * 86_400_000);
    expect(podeReabrirMatricula("cancelada", canceladaEm)).toBe(false);
  });
});
