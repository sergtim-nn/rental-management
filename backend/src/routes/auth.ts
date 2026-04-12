import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2/promise';
import pool from '../db';

const router = Router();

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { phone, password } = req.body as { phone?: string; password?: string };
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({ error: 'Server authentication is not configured' });
    return;
  }

  if (!phone || !password) {
    res.status(401).json({ error: 'Введите номер телефона и пароль' });
    return;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    res.status(401).json({ error: 'Неверный номер телефона или пароль' });
    return;
  }

  interface UserRow extends RowDataPacket {
    id: string; phone: string; name: string; password_hash: string; role: string; is_active: number;
  }

  try {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, phone, name, password_hash, role, is_active FROM users WHERE phone = ?',
      [normalizedPhone]
    );

    const user = rows[0];

    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Неверный номер телефона или пароль' });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Неверный номер телефона или пароль' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, name: user.name, role: user.role },
      jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
