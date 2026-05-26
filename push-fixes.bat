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
echo Committing (skipped if nothing new)...
git diff --cached --quiet && (
  echo Nothing new to commit - pushing existing commits to Railway...
) || (
  git commit -m "fix(backend): resolve tsc compile error blocking Railway deploy

- Fix string | null type on businessIdToUse in POST /api/shifts — tsc was
  rejecting the Drizzle insert, causing Railway build to fail silently and
  keep serving the previous deployment (which lacked seed-demo-business)
- seed-demo-business endpoint was already written; now actually ships"
)
echo.
echo Pushing to prod and main...
git push origin prod
git push origin main
echo.
echo Done! Railway will redeploy in ~60 seconds.
pause
