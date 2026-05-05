# Builder (Збірка та компіляція)
FROM node:24 AS builder

# Встановлюємо робочу директорію всередині контейнера
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# ===============================
# Production
FROM node:24 AS production

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/src/server.js"]