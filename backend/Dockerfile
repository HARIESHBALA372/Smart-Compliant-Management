# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npx prisma generate && npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

# Copy the full node_modules from the build stage so the generated Prisma
# client AND the Prisma CLI (used by compose's `prisma db push` step) are
# present, per Prisma's official multi-stage guidance.
COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "dist/server.js"]