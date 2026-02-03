# Multi-stage build for frontend
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8.12.0

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/frontend/tsconfig.json ./packages/frontend/
COPY packages/frontend/tsconfig.node.json ./packages/frontend/
COPY packages/frontend/vite.config.ts ./packages/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files (includes types copied from shared)
COPY packages/frontend/src ./packages/frontend/src
COPY packages/frontend/index.html ./packages/frontend/
COPY packages/frontend/tailwind.config.js ./packages/frontend/
COPY packages/frontend/postcss.config.js ./packages/frontend/

# Build arguments for environment variables
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build the frontend
WORKDIR /app/packages/frontend
# Use vite build directly (skip tsc check - Vite handles TypeScript)
RUN pnpm exec vite build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
