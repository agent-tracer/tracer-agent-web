import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // 게이트웨이가 이 자산을 접두어 아래에 내므로 청크 주소를 진입점 기준 상대 경로로 낸다.
  base: "./",
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
    federation({
      name: "agent",
      filename: "remoteEntry.js",
      dts: false,
      exposes: {
        "./routes": "./src/routes.ts",
      },
      remotes: {
        tracerWeb: {
          type: "module",
          name: "tracerWeb",
          entry: "/remoteEntry.js",
        },
      },
      // 다섯 라이브러리가 두 인스턴스로 갈라지면 훅과 컨텍스트와 캐시가 조용히 깨진다.
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
        "react-router-dom": { singleton: true, requiredVersion: false },
        "@tanstack/react-query": { singleton: true, requiredVersion: false },
        zustand: { singleton: true, requiredVersion: false },
      },
    }),
  ],
  build: {
    // 연합이 공유 의존성을 비동기 초기화 래퍼로 감싸므로 청크 구성은 federation 플러그인이 갖는다.
    target: "esnext",
    // 화면이 아니라 자산이므로 문서 진입점이 없고 내보내는 모듈이 그 자리를 대신한다.
    rollupOptions: { input: "./src/routes.ts" },
  },
});
