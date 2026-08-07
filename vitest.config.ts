import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Vitest bundles its own Vite (rolldown-based); override tsconfig's
  // `jsx: "preserve"` so .tsx test files are transformed.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    environment: "node",
    // Client tests opt into jsdom via a "@vitest-environment jsdom" docblock.
    include: ["server/**/*.test.ts", "client/src/**/*.test.{ts,tsx}"],
  },
});
