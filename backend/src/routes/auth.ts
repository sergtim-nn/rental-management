import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD ?? '';
  const jwtSecret     = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({ error: 'Server authentication is not configured' });
    return;
  }

  if (!password || !adminPassword) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const a = Buffer.from(password);
  const b = Buffer.from(adminPassword);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '30d' });
  res.json({ token });
});

export default router;
