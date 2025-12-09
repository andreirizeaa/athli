#!/bin/bash

# Android Emulator Startup Script
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"

echo "Checking for available Android Virtual Devices..."
AVDS=$($ANDROID_HOME/emulator/emulator -list-avds 2>/dev/null)

if [ -z "$AVDS" ]; then
  echo "❌ No AVDs found!"
  echo ""
  echo "Please create an AVD in Android Studio:"
  echo "1. Open Android Studio"
  echo "2. Go to: More Actions > Virtual Device Manager"
  echo "3. Click 'Create Device'"
  echo "4. Select Pixel 6 and Android 14.0 (API 36)"
  echo "5. Finish the setup"
  exit 1
fi

echo "Available AVDs:"
echo "$AVDS" | nl
echo ""

# Get first AVD if no argument provided
AVD_NAME=${1:-$(echo "$AVDS" | head -1)}

echo "Starting emulator: $AVD_NAME"
echo "This may take a minute..."

# Start emulator in background
$ANDROID_HOME/emulator/emulator -avd "$AVD_NAME" > /dev/null 2>&1 &

echo "✅ Emulator is starting..."
echo "Wait for the emulator to fully boot, then run: npm run android"

