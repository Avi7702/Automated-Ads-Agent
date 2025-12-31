# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including dev dependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
# This runs "vite build && esbuild ..."
RUN npm run build


# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy drizzle config and schema for migration script
COPY drizzle.config.ts ./
COPY --from=builder /app/shared ./shared

# Create uploads directory if it doesn't exist (for attached_assets volume)
RUN mkdir -p attached_assets

# Set environment to production
ENV NODE_ENV=production
# Note: Railway sets PORT dynamically, don't hardcode it
# Default to 8080 if not set by platform
ENV PORT=8080

# Expose the port (Railway ignores this and uses its own port mapping)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
