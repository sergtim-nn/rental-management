import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { userPool } from '../db';
import { generateId } from '../utils';
import { AuthUser } from '../middleware/auth';
import { logError } from '../logger';

const router = Router();

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

interface UserRow extends RowDataPacket {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'user';
  is_active: number;
  created_at: string;
}

function rowToUser(u: UserRow) {
  return { id: u.id, phone: u.phone, name: u.name, role: u.role, isActive: Boolean(u.is_active), created_at: u.created_at };
}

// GET /api/users — список всех пользователей (только admin)
// Возвращает пользователей из базы данных пользователей (userPool)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const caller = req.user as AuthUser;
  if (caller.role !== 'admin') {
    res.status(403).json({ error: 'Доступ запрещён' });
    return;
  }

  try {
    const [rows] = await userPool.query<UserRow[]>(
      'SELECT id, phone, name, role, is_active, created_at FROM users ORDER BY created_at ASC'
    );
    res.json(rows.map(rowToUser));
  } catch (err) {
    logError('GET /users', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/users — создать пользователя (только admin)
// Новый пользователь сохраняется в базу данных пользователей (userPool)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const caller = req.user as AuthUser;
  if (caller.role !== 'admin') {
    res.status(403).json({ error: 'Доступ запрещён' });
    return;
  }

  const { phone, name, password, role } = req.body as {
    phone?: string;
    name?: string;
    password?: string;
    role?: string;
  };

  if (!phone || !password) {
    res.status(400).json({ error: 'Телефон и пароль обязательны' });
    return;
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 10) {
    res.status(400).json({ error: 'Некорректный номер телефона' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    return;
  }

  const userRole = role === 'admin' ? 'admin' : 'user';
  const id = generateId();
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  try {
    await userPool.query<ResultSetHeader>(
      'INSERT INTO users (id, phone, name, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [id, normalizedPhone, name ?? '', passwordHash, userRole, createdAt]
    );
    res.status(201).json({ id, phone: normalizedPhone, name: name ?? '', role: userRole, isActive: true, created_at: createdAt });
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Пользователь с таким номером уже существует' });
    } else {
      logError('POST /users', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
});

// PUT /api/users/:id — обновить пользователя (admin или сам себя)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const caller = req.user as AuthUser;
  const { id } = req.params;

  if (caller.role !== 'admin' && caller.userId !== id) {
    res.status(403).json({ error: 'Доступ запрещён' });
    return;
  }

  const { name, password, role, isActive } = req.body as {
    name?: string;
    password?: string;
    role?: string;
    isActive?: boolean;
  };

  const setClauses: string[] = [];
  const values: (string | number)[] = [];

  if (name !== undefined) {
    setClauses.push('name = ?');
    values.push(name);
  }

  if (password) {
    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
      return;
    }
    setClauses.push('password_hash = ?');
    values.push(await bcrypt.hash(password, 10));
  }

  // Только admin может менять роль и статус активности
  if (caller.role === 'admin') {
    if (role !== undefined) {
      setClauses.push('role = ?');
      values.push(role === 'admin' ? 'admin' : 'user');
    }
    if (isActive !== undefined) {
      setClauses.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'Нет данных для обновления' });
    return;
  }

  values.push(id);

  // Пользователь обновляет себя — ищем в userPool
  const pool = userPool;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, phone, name, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );

    res.json(rowToUser(rows[0]));
  } catch (err) {
    logError('PUT /users/:id', err, { id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/users/:id — удалить пользователя (только admin, нельзя удалить себя)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const caller = req.user as AuthUser;
  if (caller.role !== 'admin') {
    res.status(403).json({ error: 'Доступ запрещён' });
    return;
  }

  const { id } = req.params;
  if (caller.userId === id) {
    res.status(400).json({ error: 'Нельзя удалить собственный аккаунт' });
    return;
  }

  try {
    const [result] = await userPool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logError('DELETE /users/:id', err, { id });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
