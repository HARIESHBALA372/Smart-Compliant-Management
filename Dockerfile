# ---- Build Stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Allow configuring environment variables at build time
ARG VITE_API_URL=/api
ARG VITE_ML_API_URL=http://localhost:8000
ARG VITE_WS_URL=/ws

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_ML_API_URL=${VITE_ML_API_URL} \
    VITE_WS_URL=${VITE_WS_URL}

COPY index.html tsconfig*.json vite.config.ts ./
COPY public ./public
COPY src ./src

RUN npm run build

# ---- Runtime Stage ----
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
