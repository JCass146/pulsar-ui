# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json* ./

# Install dependencies with increased memory for ARM builds
# Raspberry Pi 4 needs NODE_OPTIONS to avoid OOM during builds
RUN npm ci --only=production=false

# Copy source files including CSS modules
COPY . .

# Build the production bundle
# Skip TypeScript type checking on ARM to avoid OOM
# Type checking is done in CI/CD or local development
RUN npm run build:docker

# ---- runtime stage ----
FROM nginx:1.27-alpine

# Replace default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built site
COPY --from=build /app/dist /usr/share/nginx/html

# Ensure generated HTML has no `crossorigin` attributes (some browsers/extensions can cause CSSOM issues)
RUN if [ -d /usr/share/nginx/html ]; then \
			find /usr/share/nginx/html -type f -name '*.html' -exec sed -i 's/ crossorigin//g' {} \; || true; \
		fi

# Copy runtime config template into the served directory
COPY config.template.json /usr/share/nginx/html/config.template.json

# Copy entrypoint script that generates /config.json at container start
COPY docker-entrypoint.d/99-gen-config.sh /docker-entrypoint.d/99-gen-config.sh
RUN chmod +x /docker-entrypoint.d/99-gen-config.sh

EXPOSE 80
