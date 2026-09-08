@echo off
title SentinelAI Security Operations Platform
color 0A
cd /d "%~dp0"

echo ======================================================================
echo           SENTINELAI - SECURITY OPERATIONS PLATFORM
echo ======================================================================
echo.

:: 1. Setup Node.js in PATH
if exist "C:\Users\%USERNAME%\nodejs\node.exe" (
    set "PATH=C:\Users\%USERNAME%\nodejs;%PATH%"
)
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not found!
    echo Please install Node.js.
    echo.
    pause
    exit /b 1
)

echo [*] Node.js detected:
call node -v
echo.

:: 2. Check node_modules
if not exist "node_modules\" (
    echo [*] Installing dependencies - please wait...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: 3. Check build (.next folder)
if not exist ".next\" (
    echo [*] Building project - please wait...
    call npm run build
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
)

echo ======================================================================
echo   READY TO LAUNCH!
echo.
echo   URL: http://localhost:3000
echo.
echo   DEMO CREDENTIALS:
echo   - Admin   : admin@sentinelai.com   / SentinelAI@2024
echo   - Analyst : analyst@sentinelai.com / Analyst@2024
echo   - Viewer  : viewer@sentinelai.com  / Viewer@2024
echo ======================================================================
echo.
echo [*] Starting server on http://localhost:3000 ...
echo [*] Opening browser in 3 seconds...
echo.

:: Launch browser in background after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: 4. Start the server
call npm run start

echo.
echo Server has stopped.
pause
