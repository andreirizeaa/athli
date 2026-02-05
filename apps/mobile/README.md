# Athli Mobile

The mobile application for Athli, built with React Native and Expo.

## Tech Stack

- **React Native** - Mobile framework
- **Expo** - React Native tooling and development platform
- **Expo Router** - File-based routing
- **TypeScript** - Type safety
- **React Native Reanimated** - Animations
- **React Native Keyboard Controller** - Keyboard handling

## Getting Started

### Prerequisites

- Node.js 22.x or higher
- npm 10.0.0 or higher
- **iOS Development**: Xcode (macOS only)
- **Android Development**: Android Studio with Android SDK

### Installation

Dependencies are installed at the root level. If you need to install dependencies for this app specifically:

```bash
npm install
```

### Development

Start the Expo development server:

```bash
npm start
```

This will start the Expo development server. You can then:

- Press `i` to open iOS simulator (requires Xcode)
- Press `a` to open Android emulator (requires Android Studio)
- Scan the QR code with the Expo Go app on your physical device

### Running on Specific Platforms

#### iOS

```bash
npm run ios
```

This will build and run the app on the iOS simulator.

#### Android

```bash
npm run android
```

This will build and run the app on the Android emulator or connected device.

#### Web

```bash
npm run web
```

This will start the web version of the app.

## Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator/device
- `npm run web` - Run on web

## Environment Variables

Create a `.env` file in this directory with the following variables:

```env
EXPO_PUBLIC_API_URL=your_api_url
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Project Structure

```
mobile/
├── app/              # Expo Router pages
├── components/       # React Native components
│   ├── buttons/     # Button components
│   ├── calendar/    # Calendar components
│   ├── chats/       # Chat components
│   └── clients/     # Client components
├── assets/          # Images, fonts, and other assets
├── constants/       # App constants
├── contexts/        # React context providers
├── hooks/           # React hooks
├── lib/             # Utilities
│   ├── i18n/        # Internationalization
│   └── utils/       # Utility functions
├── services/        # API services
└── types/           # TypeScript type definitions
```

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

See the [Expo documentation](https://docs.expo.dev/build/introduction/) for more information on building for production.
