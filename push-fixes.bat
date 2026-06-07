@echo off
setlocal enabledelayedexpansion

echo === Pushing to prod ===
git push origin prod
if errorlevel 1 (
    echo ERROR: push to prod failed
    exit /b 1
)

echo === Syncing main with prod ===
git fetch origin
git push origin prod:main --force-with-lease
if errorlevel 1 (
    echo ERROR: push to main failed
    exit /b 1
)

echo === Verifying branches in sync ===
git fetch origin
set DRIFT_FOUND=0
for /f %%i in ('git log origin/main..origin/prod --oneline') do (
    set DRIFT_FOUND=1
    goto :drift_detected
)
for /f %%i in ('git log origin/prod..origin/main --oneline') do (
    set DRIFT_FOUND=1
    goto :drift_detected
)
goto :sync_ok

:drift_detected
echo ERROR: branches are not in sync after push
git log origin/main..origin/prod --oneline
git log origin/prod..origin/main --oneline
exit /b 1

:sync_ok
echo === All branches synced ===
exit /b 0
