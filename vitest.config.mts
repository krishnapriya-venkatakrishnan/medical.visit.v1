import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const emptyModule = fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url));

export default defineConfig({
  resolve: {
    // Resolve the "@/*" alias from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // Server files import these marker packages; under test they must be inert
      // so the modules can be imported in a plain Node environment.
      "server-only": emptyModule,
      "client-only": emptyModule,
    },
  },
  test: {
    root,
    environment: "node",
    watch: false,
    include: ["tests/**/*.test.ts"],
    // Do not let the developer's shell environment leak into unit tests. Tests
    // that need a value set it explicitly with vi.stubEnv.
    env: { ANTHROPIC_API_KEY: "", ANTHROPIC_WORKSPACE_ID: "", ANTHROPIC_MODEL: "" },
  },
});
