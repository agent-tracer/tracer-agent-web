import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  // 연합 표면은 호스트가 실행 시점에 넘기므로 시험은 같은 계약의 대역으로 지난다.
  resolve: {
    alias: {
      "tracerWeb/ui": new URL("./test/host/ui.tsx", import.meta.url).pathname,
      "tracerWeb/store": new URL("./test/host/store.tsx", import.meta.url).pathname,
      "tracerWeb/api": new URL("./test/host/api.ts", import.meta.url).pathname,
      "tracerWeb/guidance": new URL("./test/host/guidance.ts", import.meta.url).pathname,
      "tracerWeb/entities": new URL("./test/host/entities.ts", import.meta.url).pathname,
    },
  },
  test: {
    name: "tracer-agent-web",
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.ts"],
    environment: "jsdom",
    setupFiles: ["./vitest-setup.config.ts"],
    css: false,
    restoreMocks: true,
    testTimeout: 20_000,
  },
});
