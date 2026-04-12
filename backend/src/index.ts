import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { ensureUploadsDir, generateId } from './utils';
import { authMiddleware } from './middleware/auth';
import pool from './db';
import authRouter       from './routes/auth';
import categoriesRouter from './routes/categories';
import objectsRouter    from './routes/objects';
import settingsRouter   from './routes/settings';
import stateRouter      from './routes/state';
import usersRouter      from './routes/users';

ensureUploadsDir();

// При первом запуске: если таблица users пуста и заданы ADMIN_PHONE + ADMIN_PASSWORD,
// создаём первого администратора автоматически
async function ensureAdminUser() {
  const adminPhone = process.env.ADMIN_PHONE?.replace(/\D/g, '');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPhone || !adminPassword) return;

  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM users') as [Array<{ cnt: number }>, unknown];
    if (rows[0].cnt > 0) return;

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const id = generateId();
    await pool.execute(
      'INSERT INTO users (id, phone, name, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [id, adminPhone, 'Администратор', passwordHash, 'admin', new Date().toISOString()]
    );
    console.log(`Admin user created: phone=${adminPhone}`);
  } catch (err) {
    console.error('Failed to create admin user:', err);
  }
}

ensureAdminUser();

const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth',       authRouter);
app.use('/api/users',      authMiddleware, usersRouter);
app.use('/api/state',      authMiddleware, stateRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/objects',    authMiddleware, objectsRouter);
app.use('/api/settings',   authMiddleware, settingsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/*', (_req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = parseInt(process.env.PORT ?? '3002', 10);
app.listen(PORT, () => console.log(`Rental API running on port ${PORT}`));

export default app;
