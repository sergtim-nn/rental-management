#!/bin/bash
# ============================================================
# Настройка MySQL для РентаМенеджера
# Запускать: bash setup-mysql.sh
# ============================================================
set -e

DB_PASSWORD="${1:-}"

if [ -z "$DB_PASSWORD" ]; then
  echo "Введи пароль для пользователя rental_user:"
  read -s DB_PASSWORD
fi

echo ""
echo "=== Создание БД и пользователя ==="
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS rental_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'rental_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON rental_management.* TO 'rental_user'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "=== Применение схемы БД ==="
mysql -u root rental_management < /root/rental-management/backend/schema.sql

echo ""
echo "=== Проверка таблиц ==="
mysql -u root rental_management -e "SHOW TABLES;"

echo ""
echo "=== MySQL готов! ==="
echo "Пароль для .env: DB_PASSWORD=${DB_PASSWORD}"
