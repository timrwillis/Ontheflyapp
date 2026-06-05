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
  echo Nothing new to commit - pushing existing commits...
) || (
  git commit -m "feat(rush-shifts): v0.5 frontend — availability, available-now, rush feed, claim, manager rush flow

- Worker availability template editor (weekly JSONB, multiple windows per day)
- Worker 'Available now' toggle with quick-set window options (+2h, +4h, midnight, custom)
- Rush feed with 30s polling, claim flow with race-loss handling (200/409/403)
- Manager rush toggle on shift post, auto-detect from start_time
- Post-success watching state shows pinged count and claim event (10s poll)
- Manager no-show flag button on completed shifts
- Push notification handler routes rush_shift type to claim flow
- Availability Schedule button added to worker profile screen"
)
echo.
echo Pushing to prod...
git push origin prod
if %ERRORLEVEL% neq 0 (
  echo ERROR: Push to prod failed.
  pause
  exit /b 1
)
echo.
echo Pushing to main...
git push origin main
if %ERRORLEVEL% neq 0 (
  echo ERROR: Push to main failed - possible non-fast-forward. Do NOT force push.
  echo Check with: git log origin/main..HEAD
  pause
  exit /b 1
)
echo.
echo Done! Railway will redeploy in ~60 seconds.
pause
