# Backend Boilerplate

A production-ready backend boilerplate with comprehensive features and best practices.

## Features

- Multi-database support (SQLite/PostgreSQL)
- Authentication & Authorization
- Comprehensive logging
- Error handling
- API standardization
- Security features
- Development tools
- Docker support

## Quick Start with Docker

### Development

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/backend-boiler.git
   cd backend-boiler
   ```

2. Copy and configure environment variables:

   ```bash
   cp .env.example .env
   ```

3. Start the development environment:
   ```bash
   docker compose up
   ```

The API will be available at http://localhost:3000.

### Production

1. Build and run using production configuration:

   ```bash
   # Build production image
   docker build -t backend-boiler:latest .

   # Run container
   docker run -d \
     --name backend-boiler \
     -p 3000:3000 \
     --env-file .env.production \
     backend-boiler:latest
   ```

## Docker Configuration

This project includes:

- Development environment with hot-reloading
- Production-optimized multi-stage builds
- PostgreSQL for testing/production
- SQLite for local development
- Network isolation
- Volume management
- Security best practices

For detailed Docker documentation, see [DOCKER.md](docs/DOCKER.md).

## Documentation

- [API Documentation](docs/API.md)
- [Docker Configuration](docs/DOCKER.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)

## Development

### Without Docker

1. Prerequisites:

   - Node.js 20.x
   - npm 9.x
   - SQLite or PostgreSQL

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run migrations:

   ```bash
   npm run migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev`: Start development server
- `npm test`: Run tests
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run lint`: Run linting
- `npm run format`: Format code

## License

MIT
