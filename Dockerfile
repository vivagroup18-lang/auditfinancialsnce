# ==============================================================================
# Dockerfile for NCE Audit Financials on Google Cloud Run
# Multi-stage production build optimized for speed, minimal size & security
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend and Server
# ------------------------------------------------------------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for vite & esbuild)
RUN npm ci

# Copy full application source code
COPY . .

# Compile production bundle (Vite SPA -> dist/ + esbuild server.ts -> dist/server.cjs)
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Install only runtime production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy pre-compiled dist artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create and switch to non-root user for Google Cloud security standards
USER node

# Expose Google Cloud Run default listening port
EXPOSE 8080

# Health check to ensure Cloud Run container responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Launch Node.js production server
CMD ["node", "dist/server.cjs"]
