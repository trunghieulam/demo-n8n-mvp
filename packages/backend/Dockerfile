# Multi-stage build for backend
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8.12.0

# Set working directory
WORKDIR /app

# Copy workspace files for dependency resolution
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/backend/tsconfig.json ./packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files (includes types copied from shared)
COPY packages/backend/src ./packages/backend/src

# Build the backend
WORKDIR /app/packages/backend
RUN pnpm build

# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@8.12.0

# Install build dependencies for isolated-vm (needed even in production)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies (isolated-vm needs to be built)
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Create data directory for SQLite (if used in dev)
RUN mkdir -p ./packages/backend/data

WORKDIR /app/packages/backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "dist/index.js"]
