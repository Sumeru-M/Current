import { defineConfig } from "vitest/config";

/**
 * Round one is pure functions only — the ranking engine and intent parser,
 * where every bug this codebase has shipped originated. `environment: "node"`
 * keeps the suite sub-second; add jsdom only when component tests land.
 *
 * `resolve.tsconfigPaths` resolves the `@/*` alias straight from tsconfig
 * (native in Vitest 4 — no plugin), so there is no second copy of the path
 * mapping to drift out of sync.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
