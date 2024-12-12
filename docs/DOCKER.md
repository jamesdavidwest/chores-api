# Docker Configuration Documentation

## Overview

This project uses Docker for both development and production environments. The setup includes:
- Multi-stage production builds
- Development environment with hot-reloading
- PostgreSQL for testing/production
- SQLite for local development
- Network isolation
- Volume management
- Security best practices

## Docker Files

### Production (Dockerfile)

The production Dockerfile implements a multi-stage build process for optimal image size and security:

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Stage 2: Production
FROM node:20-alpine
WORKDIR /usr/src/app
```

Key features:
- Multi-stage build to minimize final image size
- Production-only dependencies
- Non-root user for security
- Tini for proper process management
- Environment configuration
- Volume management for logs and data

### Development (Dockerfile.dev)

Development environment optimized for developer experience:

```dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
```

Key features:
- Hot-reloading enabled
- Development dependencies included
- Source code mounting
- Debug port exposed
- Development-specific environment variables
- Non-root user for security

## Docker Compose Configuration

The docker-compose.yml file orchestrates the development environment:

```yaml
version: '3.8'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    # ... configuration
```

### Services

1. API Service:
   - Development build
   - Volume mounts for source code
   - Environment variable configuration
   - Network isolation
   - Debug port mapping

2. PostgreSQL Service:
   - Test database
   - Persistent volume
   - Network isolation
   - Environment configuration

### Networks

- backend-network: Isolated bridge network for service communication

### Volumes

1. Source Code:
   - .:/usr/src/app
   - /usr/src/app/node_modules (prevented from being overwritten)

2. PostgreSQL Data:
   - postgres_data:/var/lib/postgresql/data

## Environment Configuration

### Development
```env
NODE_ENV=development
PORT=3000
DB_TYPE=sqlite
DB_PATH=./data/database.sqlite
JWT_SECRET=dev_jwt_secret
JWT_EXPIRY=24h
REFRESH_TOKEN_SECRET=dev_refresh_secret
REFRESH_TOKEN_EXPIRY=7d
LOG_LEVEL=debug
LOG_FORMAT=dev
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Production
```env
NODE_ENV=production
PORT=3000
DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_NAME=backend_boiler
DB_USER=postgres
DB_PASSWORD=<secure-password>
```

## Usage

### Development

1. Start the development environment:
   ```bash
   docker compose up
   ```

2. Access services:
   - API: http://localhost:3000
   - Debug: localhost:9229
   - PostgreSQL: localhost:5432

3. View logs:
   ```bash
   docker compose logs -f api
   ```

### Production

1. Build production image:
   ```bash
   docker build -t backend-boiler:latest .
   ```

2. Run production container:
   ```bash
   docker run -d \
     --name backend-boiler \
     -p 3000:3000 \
     -v logs:/usr/src/app/logs \
     -v data:/usr/src/app/data \
     --env-file .env.production \
     backend-boiler:latest
   ```

## Security Considerations

1. Non-root User:
   - All services run as non-root users
   - Minimal permissions granted
   - Secure volume ownership

2. Multi-stage Builds:
   - Minimal production image
   - Only necessary dependencies included
   - No build tools in production

3. Environment Separation:
   - Development and production configurations isolated
   - Separate environment files
   - No development tools in production

4. Network Security:
   - Services isolated in custom network
   - Only necessary ports exposed
   - Internal service communication contained

## Debugging

1. Access Container Shell:
   ```bash
   docker compose exec api sh
   ```

2. View Logs:
   ```bash
   docker compose logs -f [service]
   ```

3. Inspect Container:
   ```bash
   docker inspect backend-boiler-api
   ```

## Common Issues

1. Node Modules Volume:
   - Issue: Module not found errors
   - Solution: Remove node_modules volume and rebuild
   ```bash
   docker compose down -v
   docker compose up --build
   ```

2. Permission Issues:
   - Issue: Unable to write to logs/data directories
   - Solution: Check volume permissions and ownership
   ```bash
   docker compose exec api ls -la /usr/src/app/logs
   ```

3. Database Connection:
   - Issue: Cannot connect to PostgreSQL
   - Solution: Verify network configuration and credentials
   ```bash
   docker compose exec postgres psql -U postgres -d backend_boiler_test
   ```

## Best Practices

1. Image Building:
   - Use specific version tags
   - Minimize layer count
   - Optimize caching
   - Remove unnecessary files

2. Development Workflow:
   - Use volume mounts for code
   - Enable hot-reloading
   - Configure source maps
   - Set up debugging

3. Production Deployment:
   - Use multi-stage builds
   - Implement health checks
   - Configure logging
   - Set up monitoring

4. Security:
   - Run as non-root
   - Scan images
   - Update base images
   - Manage secrets properly