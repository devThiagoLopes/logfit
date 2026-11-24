#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const [, , filePath, thresholdArg] = process.argv;
const threshold = Number(thresholdArg ?? "0.9");

if (!filePath) {
  console.error("Uso: node scripts/check-test-threshold.mjs <resultados.json> [limite=0.9]");
  process.exit(1);
}

// Evita path traversal: o arquivo de resultados precisa estar dentro do
// diretório do projeto, nunca fora dele (ex: ../../etc/passwd).
const resolvedPath = resolve(process.cwd(), filePath);
const relativePath = relative(process.cwd(), resolvedPath);

if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
  console.error("Caminho inválido: o arquivo de resultados deve estar dentro do diretório do projeto.");
  process.exit(1);
}

const raw = readFileSync(resolvedPath, "utf-8");
const results = JSON.parse(raw);

const total = results.numTotalTests ?? 0;
const passed = results.numPassedTests ?? 0;

if (total === 0) {
  console.error("Nenhum teste encontrado — gate de qualidade não pode ser avaliado.");
  process.exit(1);
}

const passRate = passed / total;
const passRatePct = (passRate * 100).toFixed(1);
const thresholdPct = (threshold * 100).toFixed(0);

console.log(`Testes: ${passed}/${total} passaram (${passRatePct}%). Limite mínimo: ${thresholdPct}%.`);

if (passRate < threshold) {
  console.error("Taxa de sucesso abaixo do limite — pipeline bloqueada.");
  process.exit(1);
}

console.log("Gate de qualidade aprovado.");
