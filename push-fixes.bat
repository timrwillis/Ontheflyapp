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
git commit -m "fix(admin): single pill mount, bypass business profile gate, unified role list

- Removed duplicate AdminPill mount; now only in app/_layout.tsx (AdminSwitcher removed)
- Admin users bypass business profile completeness check on shift post
- force-complete-onboarding now seeds demo business profile if missing
- New /api/admin/seed-demo-business endpoint; callable from Admin Pill long-press menu
- New constants/Roles.ts as single source of truth for worker AND manager role lists
- All 12 roles now consistent across worker onboarding and manager shift blast
- Role keys sent to backend now match Postgres enum (lowercase 'bartender' etc.)"
echo.
echo Pushing to prod and main...
git push origin prod
git push origin main
echo.
echo Done!
pause
