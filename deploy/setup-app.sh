#!/bin/bash
# ============================================================
# Сборка и запуск приложения
# Запускать после setup-server.sh и setup-mysql.sh
# ============================================================
set -e

APP_DIR="/root/rental-management"

echo ""
echo "=== [1/4] Установка зависимостей бэкенда ==="
cd "$APP_DIR/backend"
npm install --omit=dev
npm run build
echo "Бэкенд собран: $(ls dist/index.js)"

echo ""
echo "=== [2/4] Установка зависимостей фронтенда и сборка ==="
cd "$APP_DIR"
npm install
npm run build
echo "Фронтенд собран: $(ls dist/index.html)"

echo ""
echo "=== [3/4] Запуск через PM2 ==="
cd "$APP_DIR/backend"
pm2 delete rental-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
echo "PM2 статус:"
pm2 status

echo ""
echo "=== [4/4] Проверка API ==="
sleep 2
HEALTH=$(curl -s http://localhost:3002/api/health)
echo "Health check: $HEALTH"

if echo "$HEALTH" | grep -q '"ok"'; then
  echo ""
  echo "=== Приложение запущено! ==="
else
  echo ""
  echo "ОШИБКА: API не отвечает. Смотри логи: pm2 logs rental-api"
  exit 1
fi
