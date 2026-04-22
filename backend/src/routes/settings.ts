import { Router, Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { logError } from '../logger';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await req.db.query<RowDataPacket[]>(
      'SELECT notification_days_before FROM settings WHERE id = 1',
    );
    const notificationDaysBefore = rows.length > 0
      ? (rows[0].notification_days_before as number)
      : 3;
    res.json({ notificationDaysBefore });
  } catch (err) {
    logError('GET /settings', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationDaysBefore } = req.body as { notificationDaysBefore: number };

    if (typeof notificationDaysBefore !== 'number' || notificationDaysBefore < 0) {
      res.status(400).json({ error: 'notificationDaysBefore must be a non-negative number' });
      return;
    }

    await req.db.query<ResultSetHeader>(
      `INSERT INTO settings (id, notification_days_before) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE notification_days_before = VALUES(notification_days_before)`,
      [notificationDaysBefore],
    );

    res.json({ notificationDaysBefore });
  } catch (err) {
    logError('PUT /settings', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
