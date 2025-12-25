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
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
