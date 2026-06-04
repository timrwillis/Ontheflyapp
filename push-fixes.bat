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
  git commit -m "fix(backend+frontend): profile editing + shift post + tsc cleanup

backend/src/routes/shifts.ts
- Remove duplicate closing block that caused tsc parse error on Railway

backend/src/routes/users.ts
- PATCH /api/me now accepts name + phone (profile editing fix)

backend/src/routes/workers.ts
- PATCH /api/worker-profiles/me: mirror name/phone to users table
- Add line_cook + catering to validRoles allowlist

app/edit-profile.tsx
- Switch from apiPut (404) to apiPatch on correct routes:
  workers -> PATCH /api/worker-profiles/me
  managers -> PATCH /api/me"
)
echo.
echo Pushing to prod and main...
git push origin prod
git push origin main
echo.
echo Done! Railway will redeploy in ~60 seconds.
pause
