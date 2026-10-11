#!/bin/bash
# 블로그 자동화 실행 (macOS·리눅스). Finder에서 더블클릭하세요.
cd "$(dirname "$0")" || exit 1

pause() { echo; read -r -p "  Enter를 누르면 창이 닫힙니다." _; }

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js가 설치되어 있지 않습니다."
  echo "  열리는 페이지에서 LTS 버전을 설치한 뒤, 이 파일을 다시 실행하세요."
  open "https://nodejs.org/ko/download" 2>/dev/null || xdg-open "https://nodejs.org/ko/download" 2>/dev/null
  pause; exit 1
fi

if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo
  echo "  Node.js 버전이 너무 오래되었습니다. 20 이상으로 업데이트해 주세요."
  open "https://nodejs.org/ko/download" 2>/dev/null
  pause; exit 1
fi

if [ ! -d node_modules ]; then
  echo
  echo "  처음 실행이라 필요한 파일을 설치합니다. 1~2분 걸려요..."
  if ! npm install --no-audit --no-fund; then
    echo "  설치에 실패했습니다. 인터넷 연결을 확인하고 다시 실행하세요."
    pause; exit 1
  fi
fi

npm start --silent
pause
