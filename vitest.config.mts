import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the "@/..." imports from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          // Pure logic: no database or network needed.
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          // Runs against a separate *_test database (see tests/db/global-setup.ts).
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/db/global-setup.ts"],
          setupFiles: ["tests/db/setup.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
