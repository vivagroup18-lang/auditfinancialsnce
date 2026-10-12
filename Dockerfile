# ==============================================================================
# Production Dockerfile for Google Cloud Run
# Optimized multi-stage build conforming to Google Cloud Run container standards
# ==============================================================================

# Stage 1: Build frontend and server bundle
FROM node:20-slim AS builder

WORKDIR /app

# Install all build dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy application source files
COPY . .

# Build Vite static assets and bundle server.ts into dist/
RUN npm run build

# Prune development dependencies so only production packages remain for runtime
RUN npm prune --omit=dev --no-audit --no-fund

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Container
# ------------------------------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /app

# Production environment variables required by Google Cloud Run
ENV NODE_ENV=production
ENV PORT=8080
ENV RAZORPAY_STORE_PATH=/tmp/.razorpay_orders.json
ENV REFERRAL_STORE_PATH=/tmp/.referral_store.json

# Copy production node_modules from builder (no secondary network downloads)
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy compiled frontend assets and bundled Node server from builder
COPY --chown=node:node --from=builder /app/dist ./dist

# Copy package metadata
COPY --chown=node:node --from=builder /app/package.json ./package.json

# Initialize temporary storage files with open permissions for non-root node user
RUN touch /tmp/.razorpay_orders.json /tmp/.referral_store.json && \
    chmod 666 /tmp/.razorpay_orders.json /tmp/.referral_store.json

# Use standard non-root node user for Cloud Run security compliance
USER node

# Expose default Cloud Run port
EXPOSE 8080

# Start the compiled Node.js Express server
CMD ["node", "dist/server.cjs"]

