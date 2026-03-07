# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including dev dependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application (vite build + esbuild server bundle)
RUN npm run build

# ============================================
# Stage 2: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy drizzle config and schema for migration script
COPY drizzle.config.ts ./
COPY --from=builder /app/shared ./shared

# Copy migration files for schema push
COPY --from=builder /app/migrations ./migrations

# Create uploads directory
RUN mkdir -p attached_assets && chown appuser:nodejs attached_assets

# Set environment to production
ENV NODE_ENV=production
# Default port (Railway/Render set PORT dynamically)
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health/live || exit 1

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
