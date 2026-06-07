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
  git commit -m "feat(money): Step 3 — integer cents throughout frontend

- utils/money.ts: formatMoney, formatHourlyRate, parseMoneyInput, isValidHourlyRate
- create-shift.tsx: sends hourly_pay_cents (integer) instead of hourly_pay (decimal)
- ShiftCard.tsx: reads hourly_pay_cents, boosted-pay threshold 3500 cents
- RushFeedSection.tsx: reads hourly_pay_cents, display via formatHourlyRate
- app/shift/[id].tsx: reads hourly_pay_cents, boosted-pay 3000 cents
- home/index.tsx: sort/filter/earnings all use hourly_pay_cents
- DemoData.ts: all hourly_pay values converted to hourly_pay_cents (x100)"
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
