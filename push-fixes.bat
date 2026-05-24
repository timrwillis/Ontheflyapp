@echo off
cd /d "%~dp0"

echo.
echo =========================================
echo  On The Fly - Commit and Push Fixes
echo =========================================
echo.

REM Clear any stale git locks
if exist ".git\index.lock" (
    echo Clearing stale index.lock...
    del /f /q ".git\index.lock"
)
if exist ".git\HEAD.lock" (
    echo Clearing stale HEAD.lock...
    del /f /q ".git\HEAD.lock"
)

REM Stage all changes
echo Staging all changes...
git add .
if errorlevel 1 (
    echo ERROR: git add failed.
    pause
    exit /b 1
)

REM Commit
echo Committing...
git commit -m "fix(onboarding): redesign worker roles screen as 2-column grid with proper SpaceGrotesk labels and #00FF87 selected state"
if errorlevel 1 (
    echo ERROR: git commit failed (nothing to commit?).
    pause
    exit /b 1
)

REM Push to both branches
echo.
echo Pushing to prod...
git push origin prod
if errorlevel 1 (
    echo ERROR: push to prod failed.
    pause
    exit /b 1
)

echo Pushing to main...
git push origin main
if errorlevel 1 (
    echo ERROR: push to main failed.
    pause
    exit /b 1
)

echo.
echo =========================================
echo  Done! Pushed to prod and main.
echo =========================================
echo.
pause
