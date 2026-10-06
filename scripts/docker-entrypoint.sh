#!/bin/sh
# 컨테이너 시작: (root) 업로드 폴더 권한 정리 → DB 마이그레이션 → (darak 사용자로) 서버 실행
# 호스팅 서비스의 영구 디스크는 root 소유로 붙는 경우가 많아서, 권한을 맞춘 뒤 권한을 내려놓는다.
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p "${UPLOAD_DIR:-/data/uploads}"
  chown -R darak:darak "${UPLOAD_DIR:-/data/uploads}"
  exec setpriv --reuid=darak --regid=darak --init-groups "$0" "$@"
fi

# RUN_MIGRATIONS=0 이면 건너뛴다 (마이그레이션을 따로 돌리는 환경)
if [ "${RUN_MIGRATIONS:-1}" != "0" ]; then
  echo "▶ DB 마이그레이션 적용"
  prisma migrate deploy --schema ./prisma/schema.prisma
fi

exec "$@"
