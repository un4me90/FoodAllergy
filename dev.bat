@echo off
echo ========================================
echo   급식 알레르기 알림 - 개발 모드
echo ========================================
echo.
echo 두 개의 터미널이 필요합니다:
echo.
echo [터미널 1] 백엔드:
echo   cd backend
echo   npm run dev
echo.
echo [터미널 2] 프론트엔드:
echo   cd frontend
echo   npm run dev
echo.
echo 브라우저: http://localhost:5173
echo ========================================
echo.

REM 백엔드를 새 창에서 실행
start cmd /k "cd /d %~dp0backend && npm run dev"

REM 프론트엔드를 새 창에서 실행
start cmd /k "cd /d %~dp0frontend && npm run dev"
