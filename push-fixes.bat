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
  git commit -m "fix(admin): add missing seed-demo-business endpoint

- POST /api/admin/seed-demo-business creates/updates a demo business profile
- Admin-gated via isAdminUser check
- Resolves: 404 when tapping Seed demo business profile in admin pill menu"
)
echo.
echo Pushing to prod and main...
git push origin prod
git push origin main
echo.
echo Done! Railway will redeploy in ~60 seconds.
pause
