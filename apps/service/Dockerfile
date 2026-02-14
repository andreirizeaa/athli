# ──────────────────────────────────────────────
# Stage 1: Install dependencies & build
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared-types package first
COPY packages/shared-types ./packages/shared-types

# Copy service package files
COPY apps/service/package.json apps/service/package-lock.json* ./apps/service/

# Update shared-types reference to local path
WORKDIR /app/apps/service
RUN sed -i 's/"@athli\/shared-types": "[^"]*"/"@athli\/shared-types": "file:..\/..\/packages\/shared-types"/g' package.json

# Install ALL dependencies (including devDependencies for tsc)
RUN npm install

# Copy source code
COPY apps/service/tsconfig.json ./
COPY apps/service/src ./src

# Build TypeScript → dist/
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: Production image
# ──────────────────────────────────────────────
FROM node:20-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S athli && \
    adduser -S athli -u 1001 -G athli

WORKDIR /app

# Copy shared-types package
COPY packages/shared-types ./packages/shared-types

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
