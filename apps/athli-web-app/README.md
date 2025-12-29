# Athli Web App

The main web application for Athli, built with Next.js.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Supabase Auth** - Authentication

- **Supabase** - Database and backend services
- **next-intl** - Internationalization
- **Biome** - Code formatting and linting

## Getting Started

### Prerequisites

- Node.js 22.x or higher
- npm 10.0.0 or higher

### Installation

Dependencies are installed at the root level. If you need to install dependencies for this app specifically:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at **http://localhost:3001**

### Build

Build the application for production:

```bash
npm run build
```

### Production

Start the production server:

```bash
npm start
```

The application will be available at **http://localhost:3001**

## Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm start` - Start production server on port 3001
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Biome
- `npm run check` - Run Biome check and format

## Environment Variables

Create a `.env.local` file in this directory with the following variables:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_WWW_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

```

## Project Structure

```
athli-web-app/
├── app/              # Next.js App Router pages
├── components/       # React components
│   └── ui/          # shadcn/ui components
├── lib/             # Utilities and services
│   ├── api/         # API clients
│   ├── athletes/    # Athlete services
│   ├── calendar/    # Calendar services
│   ├── i18n/        # Internationalization
│   ├── library/     # Library services (exercises, programs, workouts)
│   ├── messaging/   # Messaging services
│   └── providers/   # React context providers
├── public/          # Static assets
└── hooks/           # React hooks
```
