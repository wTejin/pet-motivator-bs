FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY src ./src/
RUN npx prisma generate
RUN npm run build

FROM node:20
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
RUN mkdir -p /app/public/avatars
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
