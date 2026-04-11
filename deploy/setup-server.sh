#!/bin/bash
# ============================================================
# РентаМенеджер — первичная настройка сервера
# Запускать: bash setup-server.sh
# ============================================================
set -e

echo ""
echo "=== [1/7] Обновление пакетов ==="
apt-get update -y

echo ""
echo "=== [2/7] Установка Node.js 22 ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v)  NPM: $(npm -v)"

echo ""
echo "=== [3/7] Установка PM2 ==="
npm install -g pm2
pm2 --version

echo ""
echo "=== [4/7] Установка MySQL ==="
if ! command -v mysql &>/dev/null; then
  apt-get install -y mysql-server
  systemctl enable mysql
  systemctl start mysql
fi
echo "MySQL: $(mysql --version)"

echo ""
echo "=== [5/7] Установка Nginx ==="
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
fi
echo "Nginx: $(nginx -v 2>&1)"

echo ""
echo "=== [6/7] Папка для загрузок ==="
mkdir -p /var/www/rental-uploads
chown -R www-data:www-data /var/www/rental-uploads
chmod 775 /var/www/rental-uploads
echo "Папка /var/www/rental-uploads создана"

echo ""
echo "=== [7/7] Генерация JWT_SECRET ==="
JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo ""
echo "Скопируй этот JWT_SECRET в .env:"
echo "JWT_SECRET=$JWT"

echo ""
echo "=== Сервер готов к настройке ==="
echo "Следующий шаг: настрой MySQL и создай .env"
