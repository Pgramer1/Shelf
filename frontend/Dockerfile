# ---- Stage 1: Build ----
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci

# Build args for Vite env vars (injected at build time)
ARG VITE_TMDB_API_KEY
ARG VITE_RAWG_API_KEY
ARG VITE_API_URL
ENV VITE_TMDB_API_KEY=$VITE_TMDB_API_KEY
ENV VITE_RAWG_API_KEY=$VITE_RAWG_API_KEY
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
