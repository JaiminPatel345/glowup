@echo off
REM Clear Cache Script for GrowUp Mobile App (Windows)
REM This script clears all caches and reinstalls dependencies

echo 🧹 Clearing GrowUp Mobile App Cache...
echo.

REM Remove node_modules
echo 📦 Removing node_modules...
if exist node_modules rmdir /s /q node_modules

REM Remove .expo cache
echo 🔄 Removing .expo cache...
if exist .expo rmdir /s /q .expo

REM Remove iOS build (if exists)
if exist ios\build (
  echo 🍎 Removing iOS build...
  rmdir /s /q ios\build
)

REM Remove Android build (if exists)
if exist android\build (
  echo 🤖 Removing Android build...
  rmdir /s /q android\build
)

REM Clear Metro bundler cache
echo 🚇 Clearing Metro bundler cache...
if exist %TEMP%\metro-* del /s /q %TEMP%\metro-*
if exist %TEMP%\haste-map-* del /s /q %TEMP%\haste-map-*

REM Reinstall dependencies
echo.
echo 📥 Installing dependencies...
call yarn install

echo.
echo ✅ Cache cleared successfully!
echo.
echo 🚀 Now run: yarn start --clear
echo.
pause
