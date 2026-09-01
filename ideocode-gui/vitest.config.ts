import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Use the threads pool (instead of the default process pool) to avoid the
    // intermittent "Timeout waiting for worker to respond" failures seen when
    // CI hosts spawn forked workers slowly.
    pool: "threads",
  },
});
