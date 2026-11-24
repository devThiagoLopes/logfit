import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { avaliarGate, main, safePath } from "./check-test-threshold.mjs";

describe("safePath", () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("aceita um arquivo dentro do diretório base", () => {
    dir = mkdtempSync(join(tmpdir(), "check-test-threshold-"));
    const file = join(dir, "resultados.json");
    writeFileSync(file, "{}");

    expect(() => safePath(file, dir)).not.toThrow();
  });

  it("rejeita um caminho que escapa do diretório base", () => {
    dir = mkdtempSync(join(tmpdir(), "check-test-threshold-"));
    const outside = mkdtempSync(join(tmpdir(), "check-test-threshold-outside-"));
    const outsideFile = join(outside, "secreto.json");
    writeFileSync(outsideFile, "{}");

    try {
      expect(() => safePath(outsideFile, dir)).toThrow(/fora do diretório do projeto/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejeita um symlink que aponta pra fora do diretório base", () => {
    dir = mkdtempSync(join(tmpdir(), "check-test-threshold-"));
    const outside = mkdtempSync(join(tmpdir(), "check-test-threshold-outside-"));
    const outsideFile = join(outside, "secreto.json");
    writeFileSync(outsideFile, "{}");

    const link = join(dir, "link.json");
    try {
      symlinkSync(outsideFile, link);
    } catch (err) {
      // Criar symlink sem privilégio de admin falha no Windows (EPERM) —
      // ambiente sem suporte, não é uma falha do código. Roda de verdade no CI (Linux).
      if (err.code === "EPERM") {
        rmSync(outside, { recursive: true, force: true });
        return;
      }
      throw err;
    }

    try {
      expect(() => safePath(link, dir)).toThrow(/fora do diretório do projeto/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("avaliarGate", () => {
  it("aprova quando a taxa de sucesso atinge o limite", () => {
    const { ok, mensagem } = avaliarGate({ numTotalTests: 10, numPassedTests: 9 }, 0.9);

    expect(ok).toBe(true);
    expect(mensagem).toContain("aprovado");
  });

  it("reprova quando a taxa de sucesso fica abaixo do limite", () => {
    const { ok, mensagem } = avaliarGate({ numTotalTests: 10, numPassedTests: 5 }, 0.9);

    expect(ok).toBe(false);
    expect(mensagem).toContain("bloqueada");
  });

  it("reprova quando não há testes", () => {
    const { ok, mensagem } = avaliarGate({ numTotalTests: 0, numPassedTests: 0 }, 0.9);

    expect(ok).toBe(false);
    expect(mensagem).toContain("Nenhum teste encontrado");
  });
});

describe("main", () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("retorna 1 e orienta o uso quando não recebe um caminho", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(main(["node", "check-test-threshold.mjs"])).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Uso:"));
  });

  it("retorna 0 quando a taxa de sucesso do arquivo atinge o limite", () => {
    // main() valida o caminho contra process.cwd(), então o fixture precisa
    // estar dentro do diretório do projeto (não em os.tmpdir()).
    dir = mkdtempSync(join(process.cwd(), "check-test-threshold-tmp-"));
    const file = join(dir, "resultados.json");
    writeFileSync(file, JSON.stringify({ numTotalTests: 10, numPassedTests: 10 }));
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(main(["node", "check-test-threshold.mjs", file, "0.9"])).toBe(0);
  });

  it("retorna 1 quando a taxa de sucesso do arquivo fica abaixo do limite", () => {
    dir = mkdtempSync(join(process.cwd(), "check-test-threshold-tmp-"));
    const file = join(dir, "resultados.json");
    writeFileSync(file, JSON.stringify({ numTotalTests: 10, numPassedTests: 1 }));
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(main(["node", "check-test-threshold.mjs", file, "0.9"])).toBe(1);
  });

  it("propaga o erro quando o caminho escapa do diretório do projeto", () => {
    expect(() => main(["node", "check-test-threshold.mjs", "../../etc/passwd", "0.9"])).toThrow();
  });
});
