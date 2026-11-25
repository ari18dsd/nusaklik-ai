# syntax=docker/dockerfile:1

# Stage 1: Build React + Vite frontend ke folder dist/
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# Stage 2: Production runtime image (tanpa devDependencies, non-root, tanpa Secrets)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Salin hasil build frontend dan file server runtime yang dibutuhkan
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Siapkan direktori fallback lokal dengan kepemilikan user non-root node
RUN mkdir -p /app/private_storage/products /app/private_storage/proofs /app/public_uploads \
  && chown -R node:node /app

USER node

EXPOSE 8080

CMD ["./node_modules/.bin/tsx", "server.ts"]
