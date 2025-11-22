# =============================================================================
# Compass Navigator MCP Server - Dockerfile
# =============================================================================
# Multi-stage build for production deployment
# Based on Node.js 20 Alpine for minimal image size
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# -----------------------------------------------------------------------------
# Stage 2: Production Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Add labels for container identification
LABEL org.opencontainers.image.title="Compass Navigator MCP Server"
LABEL org.opencontainers.image.description="MCP Server for Compass Navigator integration with IDEA on Action"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="IDEA on Action"
LABEL org.opencontainers.image.source="https://github.com/IDEA-on-Action/idea-on-action"

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy only necessary files from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV MCP_TRANSPORT=http

# Expose port
EXPOSE 3001

# Switch to non-root user
USER nodejs

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:3001/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js", "--http"]
