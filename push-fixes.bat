@echo off
cd /d "%~dp0"
echo.
echo Clearing stale git locks...
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo.
echo Staging all changes...
git add .
echo.
echo Committing...
git commit -m "feat(admin): full demo god mode — paywall bypass, role switching, floating pill, go-live fix"
echo.
echo Pushing to prod and main...
git push origin prod
git push origin main
echo.
echo Done!
pause
