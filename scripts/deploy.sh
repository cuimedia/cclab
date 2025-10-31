#!/usr/bin/env bash
set -euo pipefail

# One-click deploy for server
# Usage:
#   bash scripts/deploy.sh              # deploy main
#   bash scripts/deploy.sh <branch>     # deploy specific branch

APP_NAME="whatsapp-float"
BRANCH="${1:-main}"

echo "[deploy] switching to branch: ${BRANCH}"
git fetch --all --prune
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "[deploy] installing dependencies (npm ci)"
npm ci

echo "[deploy] applying DB migrations (npm run setup)"
npm run setup

echo "[deploy] building app (npm run build)"
npm run build

echo "[deploy] starting/restarting pm2 process: ${APP_NAME}"
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}" --update-env
else
  pm2 start npm --name "${APP_NAME}" -- run start
fi

pm2 save

echo "[deploy] done. pm2 status:"
pm2 status


