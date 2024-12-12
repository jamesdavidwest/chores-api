# Production Dockerfile
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build stage (if you add TypeScript or other build steps later)
# RUN npm run build

# Production image
FROM node:20-alpine

# Install additional production dependencies
RUN apk add --no-cache tini

# Set working directory
WORKDIR /usr/src/app

# Copy from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Create necessary directories with correct permissions
RUN mkdir -p /usr/src/app/logs /usr/src/app/data && \
    chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "src/server.js"]