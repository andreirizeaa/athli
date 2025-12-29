# Athli Web API

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
- npm 10.0.0 or higher

### Installation

Dependencies are installed at the root level. If you need to install dependencies for this app specifically:

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
PORT=3002
LOG_LEVEL=info
```

### Development

Run the development server with hot reload:
```bash
npm run dev
```

The API will be available at **http://localhost:3002**

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

**http://localhost:3002/api-docs**

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
4. **Repositories**: Data access layer (integrating with Supabase)

## Database Integration
 
The project uses **Supabase** as the primary database and authentication provider. The repository pattern is used to abstract data access.

## Production Considerations

- Set `NODE_ENV=production` in your environment
- Run behind a reverse proxy (Nginx, HAProxy, or cloud LB)
- Enable clustering (use Node's cluster module or PM2)
- Implement caching for read-heavy endpoints
- Monitor metrics via `/metrics` endpoint
- Use process manager (PM2) or container orchestrator for auto-restart

## Deployment to Render

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed instructions on deploying to Render.

Quick steps:
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set Root Directory to `apps/api`
4. Build Command: `npm ci && npm run build`
5. Start Command: `npm start`
6. Add all environment variables in Render dashboard
7. Deploy!

## License

ISC

