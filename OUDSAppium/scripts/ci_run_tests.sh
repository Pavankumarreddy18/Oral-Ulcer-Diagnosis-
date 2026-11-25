#!/usr/bin/env bash
set -e

# Wait for emulator to boot fully
echo "Waiting for emulator boot..."
adb wait-for-device
adb shell wait-for-device
boot_completed=""
while [ "$boot_completed" != "1" ]; do
  boot_completed=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || echo "0")
  sleep 2
done
echo "Emulator booted."

# Install APK
echo "Installing APK from: $APK_PATH"
adb install -r "$APK_PATH"

# Start Appium server in background
npx appium --port 4723 --address 127.0.0.1 &
APPIUM_PID=$!
sleep 5

# Run tests
npm test

# Cleanup
kill $APPIUM_PID 2>/dev/null || true
