import { defineConfig } from "vitest/config";

// Standalone Vitest config for the client.
// Deliberately does NOT load vite.config.ts, which wires the dev-server proxy
// (getServerPort()) and production manualChunks — neither is needed in tests.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
