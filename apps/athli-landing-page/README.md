# Athli Landing Page

The marketing landing page for Athli, built with Next.js.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
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

The application will be available at **http://localhost:3000**

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

The application will be available at **http://localhost:3000**

## Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm start` - Start production server on port 3000
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Biome
- `npm run check` - Run Biome check and format

## Environment Variables

Create a `.env.local` file in this directory with the following variables:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_WWW_URL=http://localhost:3000
```

## Project Structure

```
athli-landing-page/
├── app/              # Next.js App Router pages
├── components/       # React components
│   └── ui/          # shadcn/ui components
├── lib/             # Utilities and helpers
│   ├── i18n/        # Internationalization
│   └── utils.ts     # Utility functions
├── public/          # Static assets
└── hooks/           # React hooks
```
