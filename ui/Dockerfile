# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine

# Replace default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built site
COPY --from=build /app/dist /usr/share/nginx/html

# Copy runtime config template into the served directory
COPY config.template.json /usr/share/nginx/html/config.template.json

# Copy entrypoint script that generates /config.json at container start
COPY docker-entrypoint.d/99-gen-config.sh /docker-entrypoint.d/99-gen-config.sh
RUN chmod +x /docker-entrypoint.d/99-gen-config.sh

EXPOSE 80
