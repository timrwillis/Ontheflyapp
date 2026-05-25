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

REM Stage auth fix files only
echo Staging auth fix files...
git add contexts/AuthContext.tsx lib/auth.ts app/_layout.tsx "app/(tabs)/_layout.tsx" "app/(tabs)/_layout.ios.tsx"
if errorlevel 1 (
    echo ERROR: git add failed.
    pause
    exit /b 1
)

REM Commit
echo Committing...
git commit -m "fix(auth): persist token to SecureStore, set token on signup, gate route guard on auth init - Replace in-memory-only token cache with SecureStore-backed persistence - signUpWithEmail now calls fetchUser to populate useSession after signup - Route guard waits for isInitializing before redirecting to auth-screen - iOS layout now has auth guard matching non-iOS layout - Resolves: Find Shifts bouncing to sign-in after onboarding"
if errorlevel 1 (
    echo ERROR: git commit failed (nothing to commit?).
    pause
    exit /b 1
)

REM Push to prod
echo.
echo Pushing to prod...
git push origin prod
if errorlevel 1 (
    echo ERROR: push to prod failed.
    pause
    exit /b 1
)

REM Sync to main via cherry-pick
echo.
echo Syncing to main...
git stash
git checkout main
git cherry-pick prod
if errorlevel 1 (
    echo ERROR: cherry-pick failed. Resolve conflicts manually.
    git cherry-pick --abort
    git checkout prod
    git stash pop
    pause
    exit /b 1
)
git push origin main
git checkout prod
git stash pop

echo.
echo =========================================
echo  Done! Pushed to prod and main.
echo =========================================
echo.
pause
