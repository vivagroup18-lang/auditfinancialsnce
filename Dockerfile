# ==============================================================================
# Production Dockerfile for Google Cloud Run
# Optimized multi-stage build conforming to Google Cloud Run container standards
# ==============================================================================

# Stage 1: Build frontend and server bundle
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy application source files
COPY . .

# Build Vite static assets and bundle server.ts into dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Container
# ------------------------------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /app

# Production environment variables required by Google Cloud Run
ENV NODE_ENV=production
ENV PORT=8080
ENV RAZORPAY_STORE_PATH=/tmp/.razorpay_orders.json

# Install only production runtime dependencies
COPY package*.json ./
RUN (npm ci --omit=dev || npm install --omit=dev) && npm cache clean --force

# Copy compiled frontend assets and bundled Node server from builder
COPY --from=builder /app/dist ./dist

# Ensure app directory permissions for non-root node user
RUN chown -R node:node /app

# Use standard non-root node user for Cloud Run security compliance
USER node

# Expose default Cloud Run port
EXPOSE 8080

# Start the compiled Node.js Express server
CMD ["node", "dist/server.cjs"]

