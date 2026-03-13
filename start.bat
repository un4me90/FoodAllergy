@echo off
echo ========================================
echo   급식 알레르기 알림 PWA 시작
echo ========================================
echo.

REM 프론트엔드 빌드
echo [1/2] 프론트엔드 빌드 중...
cd frontend
call npm run build
if errorlevel 1 (
  echo 빌드 실패!
  pause
  exit /b 1
)
cd ..

REM 백엔드 빌드 및 서버 시작
echo [2/2] 백엔드 서버 시작 중...
cd backend
call npm run build
echo.
echo ========================================
echo  서버 시작: http://localhost:3001
echo  개발PC에서 접속: http://localhost:3001
echo  모바일 접속: http://[PC의 IP주소]:3001
echo ========================================
echo.
node dist/index.js
