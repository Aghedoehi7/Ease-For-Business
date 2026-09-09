@echo off
cd /d "%~dp0"
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next >nul 2>&1
if exist .turbo rmdir /s /q .turbo >nul 2>&1
echo Cache cleared successfully!
echo.
echo Running npm run dev...
call npm run dev
