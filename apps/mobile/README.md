# Form AI - Development Setup Guide

Welcome to the Form AI project! This guide will help you set up the development environment and understand the project structure.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [EAS (Expo Application Services)](#eas-expo-application-services)
- [iOS Development & Deployment](#ios-development--deployment)
- [Supabase Setup](#supabase-setup)
- [Development Workflow](#development-workflow)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **EAS CLI** (`npm install -g eas-cli`)
- **Supabase CLI** (`npm install -g supabase`)
- **Xcode** (for iOS development - macOS only)
- **iOS Simulator** (via Xcode)
- **Git**

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd formai-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   # Note: The project uses legacy peer deps
   ```

3. **Set up environment variables**
   ```bash
   # Pull environment variables from EAS
   npx eas env:pull
   # Select "development" environment when prompted
   ```

4. **Start local development**
   ```bash
   npm start
   ```

## Environment Variables

The application requires several environment variables to run properly. 

### Pulling Environment Variables from EAS

EAS stores environment variables securely. To pull them locally:

```bash
# Pull environment variables for the selected environment
npx eas env:pull

# You'll be prompted to select an environment:
# - development (for local development)
# - preview (for testing builds)
# - production (requires proper permissions)
```

This will create a `.env` file in your project root with all the required environment variables for the selected environment.

### Required Environment Variables

The pulled `.env` file will include variables such as:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API
EXPO_PUBLIC_API_URL=your_api_url

# Google Sign-In
GOOGLE_URL_SCHEME=your_google_url_scheme

# App Environment
APP_ENV=development  # Options: development, preview, production
```

> **Note:** 
> - For local development, always select `development` when running `npx eas env:pull`
> - Make sure to add `.env` to your `.gitignore` (it should already be there)
> - Contact your team lead if you need access to environment variables

## EAS (Expo Application Services)

This project uses EAS for building, submitting, and managing app builds.

### EAS Setup

1. **Login to EAS**
   ```bash
   eas login
   ```

2. **Configure EAS**
   ```bash
   eas build:configure
   ```

3. **View EAS Configuration**
   
   The project includes three build profiles in `eas.json`:
   - **development**: For development builds with dev client
   - **preview**: For internal testing builds
   - **production**: For production builds

### EAS Build Commands

#### iOS Development Build
```bash
# Build for iOS simulator
eas build --platform ios --profile development

# Build for physical iOS device
eas build --platform ios --profile development --device
```

#### iOS Preview Build
```bash
# Build preview version for internal testing
eas build --platform ios --profile preview
```

#### iOS Production Build
```bash
# Build production version
eas build --platform ios --profile production
```

#### Monitor Build Status
```bash
# List all builds
eas build:list

# View specific build details
eas build:view [build-id]
```

### Pushing Updates (Over-The-Air)

After deploying a new build, you can push OTA updates:

```bash
# Publish an update for a specific channel
eas update --branch development --messageBuilder "$(git rev-parse HEAD)"

# Preview channel
eas update --branch preview --message "Preview update"

# Production channel
eas update --branch production --message "Production update"
```

## iOS Development & Deployment

### Local iOS Development

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Or run on a specific simulator
npm run ios -- --simulator="iPhone 15 Pro"
```

### Building for iOS

#### Using EAS (Recommended)

```bash
# Build for iOS with EAS
eas build --platform ios --profile development

# Download and install the build
# Follow the prompts in the terminal
```

#### Local Build (Advanced)

```bash
# Build locally (requires Xcode)
eas build --platform ios --profile development --local
```

### Submitting to App Store

```bash
# Submit the latest production build to App Store Connect
eas submit --platform ios --profile production

# Or submit a specific build
eas submit --platform ios --profile production --id [build-id]
```

### App Store Connect Integration

The project is configured to automatically increment build numbers using `autoIncrement: true` in the production profile.

## Supabase Setup

This project uses **Supabase** for backend services including authentication, database, storage, and edge functions.

### Two Supabase Projects

The project uses two Supabase instances:

1. **Production Supabase Project** - Live production database and services
2. **Local Supabase Project** - For local development and testing

### Local Supabase Development

For local development, you should use the local Supabase instance:

```bash
# Start local Supabase
npx supabase start

# This will:
# - Start a local Postgres database
# - Start Supabase Studio (accessible at http://localhost:54323)
# - Start API Gateway (accessible at http://localhost:54321)
# - Start all Edge Functions locally
```

#### Local Supabase Configuration

After starting Supabase locally, you'll see connection details like:

```
API URL: http://localhost:54321
Studio URL: http://localhost:54323
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
anon key: your_local_anon_key
service_role key: your_local_service_role_key
```

**Important:** If you're using local Supabase, you should update the Supabase-related variables in your `.env` file with these local values:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
```

Alternatively, you can use the EAS-pulled environment variables which point to the production Supabase instance.

#### Supabase Studio

Access the local Supabase Studio:
- URL: http://localhost:54323
- Explore tables, run queries, manage database schema

#### Local Edge Functions

Edge functions are located in `supabase/functions/`:

- `push-notifications/` - Handles push notification triggers
- `revenuecat-webhook/` - Handles RevenueCat webhooks
- `superwall-webhook/` - Handles Superwall webhooks
- `check-daily-video-submissions/` - Checks daily video submissions
- `send-due-notifications/` - Sends due notifications
- `delete-auth-user/` - User deletion handler
- `delete-user-storage/` - Storage cleanup handler
- `resend-webhook/` - Webhook retry handler

**Run Edge Functions Locally:**

```bash
# Serve all functions locally
npx supabase functions serve

# Or serve a specific function
npx supabase functions serve push-notifications
```

### Production Supabase

For production builds and testing, the app connects to the production Supabase project.

**Important:** 
- When you run `npx eas env:pull` and select `development`, it will pull development environment variables (which typically point to production Supabase)
- For local Supabase development, manually update the Supabase URLs in your `.env` file to point to localhost
- For production builds, EAS will automatically use the correct production environment variables

### Database Migrations

```bash
# Create a new migration
npx supabase migration new migration_name

# Apply migrations to local database
npx supabase db reset

# Push migrations to production (requires authentication)
npx supabase db push
```

### Seeding Data (if applicable)

```bash
# Seed local database
npx supabase db seed
```

## Development Workflow

### 1. Daily Development

```bash
# Start Supabase locally
npx supabase start

# Start Expo development server
npm start

# Run on iOS simulator
npm run ios
```

### 2. Working on Edge Functions

```bash
# Start Supabase and functions
npx supabase start
npx supabase functions serve

# Make changes in supabase/functions/[function-name]/
# Functions will hot-reload automatically
```

### 3. Testing Database Changes

```bash
# Make schema changes locally
# Create migration
npx supabase migration new your_change

# Test locally
npx supabase db reset

# Once verified, deploy to production
npx supabase db push
```

### 4. Code Quality

```bash
# Format code
npm run format

# Lint code
npm run lint

# Check for issues (without auto-fix)
npm run check:no-write
```

## Common Commands

### Development

```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android (if configured)
npm run web            # Run web version
```

### Code Quality

```bash
npm run format         # Format code with Biome
npm run lint           # Lint and auto-fix issues
npm run check          # Run all checks and auto-fix
npm run check:no-write # Run checks without auto-fix
```

### Supabase

```bash
npx supabase start                    # Start local Supabase
npx supabase stop                     # Stop local Supabase
npx supabase status                   # Check local Supabase status
npx supabase functions serve          # Serve Edge Functions locally
npx supabase migration new <name>     # Create new migration
npx supabase db reset                 # Reset local database
npx supabase db push                  # Push migrations to production
```

### EAS

```bash
eas login                             # Login to EAS
eas env:pull                          # Pull environment variables (select environment)
eas build:list                        # List all builds
eas build --platform ios              # Build for iOS
eas update --branch development       # Push OTA update
eas submit --platform ios             # Submit to App Store
```

### Git

```bash
# Before committing, ensure code quality
npm run format
npm run lint
npm run check:no-write

# Husky will run these checks on commit
```

## Troubleshooting

### Common Issues

#### 1. Metro bundler cache issues

```bash
# Clear cache and restart
npm start -- --clear
```

#### 2. iOS build issues

```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..
cd ios && pod install && cd ..

# Rebuild
npm run ios
```

#### 3. Supabase connection issues

```bash
# Stop and restart Supabase
npx supabase stop
npx supabase start

# Verify Supabase status
npx supabase status
```

#### 4. Environment variables not loading

- Ensure `.env` file exists in project root
- Check variable names match exactly (case-sensitive)
- Restart Metro bundler after changing `.env`

#### 5. Legacy peer deps issues

The project uses `NPM_CONFIG_LEGACY_PEER_DEPS=true`. If you encounter peer dependency warnings:

```bash
npm install --legacy-peer-deps
```

### Getting Help

- **EAS Issues**: Check [EAS documentation](https://docs.expo.dev/eas/)
- **Supabase Issues**: Check [Supabase documentation](https://supabase.com/docs)
- **Expo Issues**: Check [Expo documentation](https://docs.expo.dev/)
- **React Native Issues**: Check [React Native documentation](https://reactnative.dev/)

## Project Structure

```
formai-ui/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── services/       # Business logic and services
│   ├── context/        # React Context providers
│   ├── lib/            # Utilities and configurations
│   ├── constants/      # App constants
│   ├── types/          # TypeScript types
│   └── utils/          # Helper functions
├── assets/             # Images, videos, icons
├── app/                # App configuration and background tasks
├── supabase/
│   ├── functions/      # Edge Functions
│   └── migrations/     # Database migrations
├── ios/                # iOS native code
├── android/            # Android native code
├── app.config.ts       # Expo configuration
├── eas.json            # EAS build configuration
└── package.json        # Dependencies and scripts
```

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Documentation](https://docs.expo.dev/eas/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Navigation](https://reactnavigation.org/)
- [React Query](https://tanstack.com/query/latest)

---

**Happy Coding! 🚀**

If you encounter any issues not covered in this guide, please reach out to the team or create an issue in the repository.

