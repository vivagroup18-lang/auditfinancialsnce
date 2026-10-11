# ==============================================================================
# Dockerfile for NCE Audit Financials on Google Cloud Run
# Multi-stage production container build optimized for Google Cloud Run
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend and Server Bundle
# ------------------------------------------------------------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Install build prerequisites if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package specifications
COPY package.json package-lock.json* ./

# Install dependencies for compilation (devDependencies needed for Vite & TypeScript)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy full application source files
COPY . .

# Build Vite frontend and bundled Node Express server into dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Container
# ------------------------------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Copy package specifications for production runtime dependencies
COPY package.json package-lock.json* ./

# Install only production dependencies and clean npm cache
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev && npm cache clean --force; \
    else \
      npm install --omit=dev && npm cache clean --force; \
    fi

# Copy compiled frontend and backend assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Ensure app directory and storage are owned by node user
RUN chown -R node:node /app
ENV RAZORPAY_STORE_PATH=/tmp/.razorpay_orders.json

# Use standard non-root node user for Google Cloud Run security compliance
USER node

# Expose default Cloud Run port (8080)
EXPOSE 8080

# Native health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the compiled Node.js backend server
CMD ["node", "dist/server.cjs"]
