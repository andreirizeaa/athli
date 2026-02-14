# ──────────────────────────────────────────────
# Stage 1: Build shared-types
# ──────────────────────────────────────────────
FROM node:20-alpine AS shared-builder

WORKDIR /app/packages/shared-types

# Copy shared-types package
COPY packages/shared-types/package.json packages/shared-types/package-lock.json* ./
RUN npm install

COPY packages/shared-types/ ./

# Build shared-types to JavaScript
RUN npm run build

# Update package.json exports VALUES to point to dist/ instead of src/
# Only replace values (after colon), not keys
RUN sed -i 's|": "./src/|": "./dist/|g' package.json && \
    sed -i 's|\.ts"|\.js"|g' package.json

# ──────────────────────────────────────────────
# Stage 2: Build service
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy built shared-types (with modified package.json)
COPY --from=shared-builder /app/packages/shared-types ./packages/shared-types

# Copy service package files
COPY apps/service/package.json apps/service/package-lock.json* ./apps/service/

# Update shared-types reference to local path
WORKDIR /app/apps/service
RUN sed -i 's/"@athli\/shared-types": "[^"]*"/"@athli\/shared-types": "file:..\/..\/packages\/shared-types"/g' package.json && \
    rm -f package-lock.json

# Copy .npmrc if present (ensures legacy-peer-deps and other settings match local)
COPY .npmrc* /app/apps/service/

# Install ALL dependencies (including devDependencies for tsc)
RUN npm install

# Copy source code
COPY apps/service/tsconfig.json ./
COPY apps/service/src ./src

# Build TypeScript → dist/
RUN npm run build

# ──────────────────────────────────────────────
# Stage 3: Production image
# ──────────────────────────────────────────────
FROM node:20-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S athli && \
    adduser -S athli -u 1001 -G athli

WORKDIR /app

# Copy built shared-types (package.json + dist/)
COPY --from=shared-builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=shared-builder /app/packages/shared-types/dist ./packages/shared-types/dist

# Copy service package files
COPY apps/service/package.json apps/service/package-lock.json* ./

# Update shared-types reference to local path
RUN sed -i 's/"@athli\/shared-types": "[^"]*"/"@athli\/shared-types": "file:..\/packages\/shared-types"/g' package.json

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/apps/service/dist ./dist

# Set ownership
RUN chown -R athli:athli /app

# Switch to non-root user
USER athli

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "dist/server.js"]
