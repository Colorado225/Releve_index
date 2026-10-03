import { defineConfig } from "vitest/config";

// Config dédiée aux tests : on n'y charge PAS le plugin PWA.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});