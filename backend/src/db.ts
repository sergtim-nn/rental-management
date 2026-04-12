import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const baseConfig = {
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'rental_user',
  password:           process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
};

// База данных для администраторов
export const adminPool = mysql.createPool({
  ...baseConfig,
  database: process.env.ADMIN_DB_NAME || 'rental_management_admin',
});

// База данных для обычных пользователей
export const userPool = mysql.createPool({
  ...baseConfig,
  database: process.env.USER_DB_NAME || 'rental_management',
});

// Возвращает нужный пул по роли
export function getPool(role: string) {
  return role === 'admin' ? adminPool : userPool;
}

// Для обратной совместимости (не используется в роутах)
export default userPool;
