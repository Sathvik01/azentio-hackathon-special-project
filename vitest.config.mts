import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": r("./src"), "server-only": r("./tests/server-only-stub.ts") } },
  test: { environment: "node", testTimeout: 30_000, fileParallelism: false, setupFiles: [r("./tests/setup-env.ts")] },
});
