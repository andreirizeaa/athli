# Athli

A comprehensive monorepo for the Athli platform, featuring web applications, mobile apps, and backend services.

## Project Structure

This is a monorepo managed with [Turborepo](https://turbo.build/) and npm workspaces. The project is organized into the following applications:

### Applications

- **`apps/athli-landing-page`** - Marketing landing page (Next.js)
- **`apps/athli-web-app`** - Main web application (Next.js)
- **`apps/athli-mobile`** - Mobile application (React Native/Expo)
- **`apps/athli-web-api`** - Web API backend (Express.js/TypeScript)
- **`apps/athli-mobile-api`** - Mobile API backend (FastAPI/Python)

### Packages

- **`packages/auth`** - Shared authentication utilities
- **`packages/ui`** - Shared UI components
- **`packages/utils`** - Shared utility functions

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Clerk** - Authentication
- **Convex** - Backend-as-a-Service
- **Supabase** - Database and backend services
- **next-intl** - Internationalization

### Mobile
- **React Native** - Mobile framework
- **Expo** - React Native tooling
- **Expo Router** - File-based routing

### Backend
- **Express.js** - Web API framework (TypeScript)
- **FastAPI** - Mobile API framework (Python)
- **Celery** - Background task processing
- **Redis** - Caching and task queue
- **Supabase** - Database and authentication

### Development Tools
- **Turborepo** - Monorepo build system
- **TypeScript** - Type safety across the stack
- **Biome** - Code formatting and linting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

## Getting Started

### Prerequisites

- **Node.js** 22.x or higher
- **npm** 10.0.0 or higher
- **Python** 3.12+ (for mobile API)
- **Redis** (for mobile API background tasks)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd athli
```

2. Install all dependencies:
```bash
npm install
```

That's it! The installation will handle all dependencies for all applications and packages in the monorepo.

### Development

To start all applications in development mode:

```bash
npm run dev
```

This will start all apps in parallel using Turborepo. For specific application setup and ports, see the individual README files in each app directory:

- [`apps/athli-landing-page/README.md`](./apps/athli-landing-page/README.md)
- [`apps/athli-web-app/README.md`](./apps/athli-web-app/README.md)
- [`apps/athli-mobile/README.md`](./apps/athli-mobile/README.md)
- [`apps/athli-web-api/README.md`](./apps/athli-web-api/README.md)
- [`apps/athli-mobile-api/README.md`](./apps/athli-mobile-api/README.md)

## Available Scripts

- `npm run dev` - Start all applications in development mode
- `npm run build` - Build all applications
- `npm run start` - Start all applications in production mode
- `npm run lint` - Lint all applications

## Project Architecture

The monorepo uses:

- **Turborepo** for task orchestration and caching
- **npm workspaces** for dependency management
- **Shared packages** for code reuse across applications
- **TypeScript** for type safety across the entire codebase

Each application is independently deployable and can be developed in isolation while sharing common utilities and components from the `packages/` directory.
