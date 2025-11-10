#!/bin/bash

# Clear Cache Script for GrowUp Mobile App
# This script clears all caches and reinstalls dependencies

echo "🧹 Clearing GrowUp Mobile App Cache..."
echo ""

# Navigate to the app directory
cd "$(dirname "$0")"

# Remove node_modules
echo "📦 Removing node_modules..."
rm -rf node_modules

# Remove .expo cache
echo "🔄 Removing .expo cache..."
rm -rf .expo

# Remove iOS build (if exists)
if [ -d "ios/build" ]; then
  echo "🍎 Removing iOS build..."
  rm -rf ios/build
fi

# Remove Android build (if exists)
if [ -d "android/build" ]; then
  echo "🤖 Removing Android build..."
  rm -rf android/build
fi

# Clear watchman (macOS/Linux only)
if command -v watchman &> /dev/null; then
  echo "👁️  Clearing watchman cache..."
  watchman watch-del-all
fi

# Clear Metro bundler cache
echo "🚇 Clearing Metro bundler cache..."
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

# Reinstall dependencies
echo ""
echo "📥 Installing dependencies..."
yarn install

echo ""
echo "✅ Cache cleared successfully!"
echo ""
echo "🚀 Now run: yarn start --clear"
echo ""
