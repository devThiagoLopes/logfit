import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      include: ["src/**/*.ts", "src/**/*.tsx", "scripts/**/*.mjs"],
      exclude: ["src/**/*.test.ts", "src/components/ui/**", "scripts/**/*.test.mjs"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
