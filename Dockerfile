# syntax=docker/dockerfile:1

# ---- 빌드: 잠금 파일로 의존성 레이어를 먼저 굳히고 소스를 얹는다 ----
FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

COPY tsconfig.json tsconfig.base.json tsconfig.paths.json ./
COPY architecture.manifest.mjs vite.config.ts ./
COPY types types
COPY src src
RUN npm run build

# ---- 자산: 서버가 아니라 remoteEntry와 청크뿐이며 게이트웨이가 접두어 아래에 낸다 ----
FROM nginx:alpine AS assets

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
