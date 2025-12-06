# API Backend

A scalable, production-ready Express.js API built with TypeScript, following best practices for performance, security, and maintainability.

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript
- **Framework**: Express 5.x
- **Testing**: Vitest + Supertest
- **Logging**: Pino + pino-http
- **Validation**: Zod
- **Metrics**: Prometheus (prom-client)
- **Documentation**: Swagger/OpenAPI (swagger-ui-express)

## Project Structure

```
api/
├── src/
│   ├── config/          # Environment config & logger
│   ├── loaders/          # App initialization
│   ├── api/
│   │   └── v1/          # Versioned API routes
│   │       ├── routes/
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── validators/
│   │       └── dtos/
│   ├── middlewares/      # Express middlewares
│   ├── utils/            # Utility functions
│   ├── infrastructure/   # DB, metrics, etc.
│   ├── app.ts
│   └── server.ts
├── tests/                # Integration tests
└── dist/                 # Compiled output
```

## Getting Started

### Prerequisites

- Node.js 20 LTS or higher
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

### Development

Run the development server with hot reload:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

### Production

Run the production server:
```bash
npm start
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## API Endpoints

### Documentation
- `GET /api-docs` - **Swagger UI documentation** - Interactive API documentation and testing interface

### Health Check
- `GET /health` - Returns server status

### Metrics
- `GET /metrics` - Prometheus metrics endpoint

### Users (Example)
- `GET /api/v1/users` - List all users
- `POST /api/v1/users` - Create a new user

## API Documentation

The API is fully documented using Swagger/OpenAPI. Once the server is running, you can access the interactive API documentation at:

**http://localhost:3000/api-docs**

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Interactive testing interface
- Try-it-out functionality for all endpoints

## Features

- ✅ **Security**: Helmet, CORS, rate limiting
- ✅ **Performance**: Compression, async I/O, optimized middleware
- ✅ **Observability**: Structured logging (Pino), Prometheus metrics
- ✅ **Validation**: Zod schema validation
- ✅ **Error Handling**: Centralized error handling
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Testing**: Vitest integration tests
- ✅ **Scalable Architecture**: Clean separation of concerns (routes → controllers → services → repositories)

## Architecture

The API follows a layered architecture:

1. **Routes**: Define API endpoints and apply middleware
2. **Controllers**: Handle HTTP requests/responses
3. **Services**: Business logic layer
4. **Repositories**: Data access layer (currently in-memory, ready for DB integration)

## Database Integration

The repository pattern is implemented with an in-memory store. To integrate a real database:

1. Choose your ORM (Prisma, TypeORM, Mongoose, etc.)
2. Implement the repository interfaces in `src/infrastructure/db/`
3. Replace in-memory repositories with database-backed implementations
4. Initialize DB connection in `src/loaders/index.ts`

## Production Considerations

- Set `NODE_ENV=production` in your environment
- Run behind a reverse proxy (Nginx, HAProxy, or cloud LB)
- Enable clustering (use Node's cluster module or PM2)
- Implement caching for read-heavy endpoints
- Monitor metrics via `/metrics` endpoint
- Use process manager (PM2) or container orchestrator for auto-restart

## Docker

A multi-stage Dockerfile can be added for containerized deployments. See the specification document for Docker setup details.

## License

ISC

