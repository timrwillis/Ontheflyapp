@echo off
echo === Checking branch sync ===
git fetch origin

set HAS_DRIFT=0

for /f %%i in ('git log origin/main..origin/prod --oneline') do (
    echo origin/prod has commits not on origin/main:
    git log origin/main..origin/prod --oneline
    set HAS_DRIFT=1
)

for /f %%i in ('git log origin/prod..origin/main --oneline') do (
    echo origin/main has commits not on origin/prod:
    git log origin/prod..origin/main --oneline
    set HAS_DRIFT=1
)

if !HAS_DRIFT! == 1 exit /b 1

echo Branches in sync.
exit /b 0
