# syntax=docker/dockerfile:1
# 다락 프로덕션 이미지 (Next.js standalone)

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# 1) 의존성
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# 2) 빌드 (마이그레이션 실행용 단계로도 쓴다: docker compose의 migrate 서비스)
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 웹 푸시 공개 키는 빌드 시 클라이언트 번들에 들어간다
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
RUN npx prisma generate && npm run build

# 3) 실행
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
RUN groupadd --system --gid 1001 darak && useradd --system --uid 1001 --gid darak darak && mkdir -p /data/uploads && chown -R darak:darak /data
COPY --from=build --chown=darak:darak /app/.next/standalone ./
COPY --from=build --chown=darak:darak /app/.next/static ./.next/static
COPY --from=build --chown=darak:darak /app/public ./public
USER darak
EXPOSE 3000
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
