#!/bin/bash
# ============================================================
# Настройка Nginx
# Использование: bash setup-nginx.sh ДОМЕН_ИЛИ_IP
# Пример: bash setup-nginx.sh rental.example.com
#         bash setup-nginx.sh 95.163.100.55
# ============================================================
set -e

DOMAIN="${1:-}"

if [ -z "$DOMAIN" ]; then
  echo "Введи домен или IP сервера:"
  read DOMAIN
fi

echo ""
echo "=== Настройка Nginx для: $DOMAIN ==="

# Подставить домен в конфиг
sed "s/ДОМЕН_ИЛИ_IP/$DOMAIN/g" \
  /root/rental-management/deploy/nginx-rental.conf \
  > /etc/nginx/sites-available/rental

# Включить сайт
rm -f /etc/nginx/sites-enabled/rental
ln -s /etc/nginx/sites-available/rental /etc/nginx/sites-enabled/rental

# Отключить дефолтный сайт если мешает
# rm -f /etc/nginx/sites-enabled/default

echo "=== Проверка конфига ==="
nginx -t

echo "=== Перезапуск Nginx ==="
systemctl reload nginx

echo ""
echo "=== Nginx настроен! ==="
echo "Открой в браузере: http://$DOMAIN"
echo ""
echo "Если есть домен — настроить SSL:"
echo "  certbot --nginx -d $DOMAIN"
