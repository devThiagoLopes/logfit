#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";

// Evita path traversal: resolve o caminho canônico real (segue symlinks,
// elimina "..") e garante que ele fica dentro do diretório do projeto.
// path.resolve() não basta aqui: é só léxico e não detecta symlinks.
export function safePath(input, cwd = process.cwd()) {
  const resolved = realpathSync(input);
  const baseDir = realpathSync(cwd);

  if (resolved !== baseDir && !resolved.startsWith(baseDir + sep)) {
    throw new Error(`Caminho '${input}' está fora do diretório do projeto.`);
  }

  return resolved;
}

export function avaliarGate(results, threshold) {
  const total = results.numTotalTests ?? 0;
  const passed = results.numPassedTests ?? 0;

  if (total === 0) {
    return { ok: false, mensagem: "Nenhum teste encontrado — gate de qualidade não pode ser avaliado." };
  }

  const passRate = passed / total;
  const passRatePct = (passRate * 100).toFixed(1);
  const thresholdPct = (threshold * 100).toFixed(0);
  const resumo = `Testes: ${passed}/${total} passaram (${passRatePct}%). Limite mínimo: ${thresholdPct}%.`;

  if (passRate < threshold) {
    return { ok: false, mensagem: `${resumo}\nTaxa de sucesso abaixo do limite — pipeline bloqueada.` };
  }

  return { ok: true, mensagem: `${resumo}\nGate de qualidade aprovado.` };
}

export function main(argv) {
  const [, , filePath, thresholdArg] = argv;
  const threshold = Number(thresholdArg ?? "0.9");

  if (!filePath) {
    console.error("Uso: node scripts/check-test-threshold.mjs <resultados.json> [limite=0.9]");
    return 1;
  }

  const raw = readFileSync(safePath(filePath), "utf-8");
  const results = JSON.parse(raw);

  const { ok, mensagem } = avaliarGate(results, threshold);
  console.log(mensagem);

  return ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv);
}
