@echo off
chcp 65001 >nul
title 블로그 자동화
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js가 설치되어 있지 않습니다.
  echo  열리는 페이지에서 LTS 버전을 설치한 뒤, 이 파일을 다시 실행하세요.
  start "" "https://nodejs.org/ko/download"
  pause
  exit /b 1
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo.
  echo  Node.js 버전이 너무 오래되었습니다. 20 이상으로 업데이트해 주세요.
  start "" "https://nodejs.org/ko/download"
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo  처음 실행이라 필요한 파일을 설치합니다. 1~2분 걸려요...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo  설치에 실패했습니다. 인터넷 연결을 확인하고 다시 실행하세요.
    pause
    exit /b 1
  )
)

call npm start --silent
pause
