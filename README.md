# Athli

A comprehensive monorepo for the Athli platform, featuring web applications, mobile apps, and backend services.

## Project Structure

This is a monorepo managed with [Turborepo](https://turbo.build/) and npm workspaces. The project is organized into the following applications:

### Applications

- **`apps/marketing`** - Marketing landing page (Next.js)
- **`apps/web`** - Main web application (Next.js)
- **`apps/mobile`** - Mobile application (React Native/Expo)
- **`apps/service`** - Web API backend (Express.js/TypeScript)


## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library

- **Supabase** - Database and backend services
- **next-intl** - Internationalization

### Mobile
- **React Native** - Mobile framework
- **Expo** - React Native tooling
- **Expo Router** - File-based routing

### Backend
- **Express.js** - Web API framework (TypeScript)
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

That's it! The installation will handle all dependencies for all applications in the monorepo.

### Development

To start all applications in development mode:

```bash
npm run dev
```

This will start all apps in parallel using Turborepo. For specific application setup and ports, see the individual README files in each app directory:

- [`apps/marketing/README.md`](./apps/marketing/README.md)
- [`apps/web/README.md`](./apps/web/README.md)
- [`apps/mobile/README.md`](./apps/mobile/README.md)
- [`apps/service/README.md`](./apps/service/README.md)

## Available Scripts

- `npm run dev` - Start all applications in development mode
- `npm run build` - Build all applications
- `npm run start` - Start all applications in production mode
- `npm run lint` - Lint all applications

## Project Architecture

The monorepo uses:

- **Turborepo** for task orchestration and caching
- **npm workspaces** for dependency management
- **TypeScript** for type safety across the entire codebase

Each application is independently deployable and can be developed in isolation.
